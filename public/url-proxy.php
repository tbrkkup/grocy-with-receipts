<?php
/**
 * url-proxy.php – gehärteter serverseitiger Abruf-Proxy für das Import-Widget.
 *
 * Zweck: Das Browser-Widget (grocy-import.html) darf fremde Produktseiten/Bilder
 * wegen CORS nicht direkt laden. Diese Datei holt eine per ?url=... übergebene
 * http(s)-Ressource serverseitig und gibt sie mit ihrem Content-Type zurück.
 *
 * Deploy: wie grocy-import.html nach /var/www/grocy/public/ kopieren. Sie wird von
 * nginx+PHP-FPM direkt ausgeliefert (try_files trifft die reale Datei vor index.php).
 *
 * SICHERHEIT (wichtig auf öffentlich erreichbaren Servern):
 *  - KEIN anonymer Zugriff: es ist ein gültiger Grocy-API-Key nötig (Header
 *    GROCY-API-KEY), geprüft gegen die Grocy-Datenbank (api_keys). Damit kann nur,
 *    wer ohnehin API-Zugriff hat, den Proxy nutzen – kein offener Internet-Proxy.
 *  - SSRF-Schutz gegen private/lokale/reservierte IPs (auch Cloud-Metadaten).
 *  - Redirects werden MANUELL verfolgt und bei JEDEM Hop neu geprüft.
 *  - Verbindung wird an die geprüfte IPv4 gepinnt (CURLOPT_RESOLVE) → kein
 *    DNS-Rebinding. Nur IPv4, nur http/https, 15s Timeout, max. 8 MB.
 *
 * Falls die Grocy-DB nicht unter ../data/grocy.db liegt: GROCY_DB_PATH unten anpassen
 * oder Umgebungsvariable GROCY_DB_FILE setzen.
 */

const GROCY_DB_PATH = __DIR__ . '/../data/grocy.db';
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 4;

function fail($code, $msg)
{
	http_response_code($code);
	header('Content-Type: text/plain; charset=utf-8');
	echo $msg;
	exit;
}

// --- 1) Authentifizierung: gültiger Grocy-API-Key erforderlich ---
function grocyApiKeyValid($key)
{
	if ($key === '' || $key === null)
	{
		return false;
	}
	$dbPath = getenv('GROCY_DB_FILE') ?: GROCY_DB_PATH;
	if (!is_file($dbPath))
	{
		// Fail closed – ohne DB keine Auth-Prüfung möglich.
		fail(500, 'Proxy misconfigured: Grocy DB not found (set GROCY_DB_PATH/GROCY_DB_FILE).');
	}
	try
	{
		$db = new PDO('sqlite:' . $dbPath);
		$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
		$stmt = $db->prepare('SELECT COUNT(*) FROM api_keys WHERE api_key = :k AND (expires IS NULL OR expires > datetime(\'now\'))');
		$stmt->execute([':k' => $key]);
		return ((int) $stmt->fetchColumn()) > 0;
	}
	catch (Exception $e)
	{
		return false;
	}
}

$apiKey = $_SERVER['HTTP_GROCY_API_KEY'] ?? '';
if (!grocyApiKeyValid($apiKey))
{
	fail(401, 'Unauthorized: valid GROCY-API-KEY header required.');
}

// --- 2) IP-Freigabe (SSRF-Schutz) ---
function ipAllowed($ip)
{
	// nur öffentliche IPv4; private, reservierte, loopback, link-local werden abgelehnt
	return (bool) filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
}

// Löst einen Host zu IPv4 auf und gibt eine geprüfte, „pinnbare" IP zurück (oder false,
// wenn irgendeine der zugehörigen Adressen intern/reserviert ist bzw. IPv6 vorliegt).
function resolvePinnedIp($host)
{
	if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6))
	{
		return false; // IPv6-Literale nicht erlaubt
	}
	if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4))
	{
		return ipAllowed($host) ? $host : false;
	}
	$ips = [];
	$recs = @dns_get_record($host, DNS_A);
	if (is_array($recs) && count($recs) > 0)
	{
		foreach ($recs as $r)
		{
			if (!empty($r['ip']))
			{
				$ips[] = $r['ip'];
			}
		}
	}
	else
	{
		$byName = @gethostbynamel($host);
		if (is_array($byName))
		{
			$ips = $byName;
		}
	}
	if (empty($ips))
	{
		return false;
	}
	$pin = null;
	foreach ($ips as $ip)
	{
		if (!ipAllowed($ip))
		{
			return false; // eine schlechte Adresse → gesamten Host ablehnen
		}
		if ($pin === null)
		{
			$pin = $ip;
		}
	}
	return $pin;
}

function validateUrlParts($url)
{
	$parts = parse_url($url);
	if ($parts === false || empty($parts['scheme']) || empty($parts['host']) ||
		!in_array(strtolower($parts['scheme']), ['http', 'https'], true))
	{
		return false;
	}
	return $parts;
}

// --- 3) Abruf mit manueller, pro Hop geprüfter Redirect-Verfolgung ---
$url = isset($_GET['url']) ? trim($_GET['url']) : '';
if ($url === '')
{
	fail(400, 'Missing url parameter');
}

$contentType = 'application/octet-stream';
$httpCode = 200;
$body = false;

for ($hop = 0; $hop <= MAX_REDIRECTS; $hop++)
{
	$parts = validateUrlParts($url);
	if ($parts === false)
	{
		fail(400, 'Only absolute http(s) URLs are allowed');
	}
	$host = $parts['host'];
	$scheme = strtolower($parts['scheme']);
	$port = isset($parts['port']) ? (int) $parts['port'] : ($scheme === 'https' ? 443 : 80);

	$pinIp = resolvePinnedIp($host);
	if ($pinIp === false)
	{
		fail(403, 'Target host is not allowed');
	}

	$redirectLocation = null;
	$ch = curl_init($url);
	curl_setopt_array($ch, [
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_FOLLOWLOCATION => false,               // Redirects manuell + geprüft
		CURLOPT_CONNECTTIMEOUT => 8,
		CURLOPT_TIMEOUT => 15,
		CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GrocyImportBot/1.0)',
		CURLOPT_SSL_VERIFYPEER => true,
		CURLOPT_SSL_VERIFYHOST => 2,
		CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
		CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
		CURLOPT_RESOLVE => [$host . ':' . $port . ':' . $pinIp], // an geprüfte IP pinnen
		CURLOPT_NOPROGRESS => false,
		CURLOPT_BUFFERSIZE => 65536,
		CURLOPT_PROGRESSFUNCTION => function ($ch, $dltotal, $dlnow) {
			return ($dlnow > MAX_BYTES) ? 1 : 0;
		},
		CURLOPT_HEADERFUNCTION => function ($ch, $header) use (&$redirectLocation) {
			$p = strpos($header, ':');
			if ($p !== false && strtolower(trim(substr($header, 0, $p))) === 'location')
			{
				$redirectLocation = trim(substr($header, $p + 1));
			}
			return strlen($header);
		},
	]);

	$body = curl_exec($ch);
	if ($body === false)
	{
		$err = curl_error($ch);
		curl_close($ch);
		fail(502, 'Fetch failed: ' . $err);
	}
	$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/octet-stream';
	curl_close($ch);

	if ($httpCode >= 300 && $httpCode < 400 && $redirectLocation)
	{
		// Ziel der Weiterleitung absolut machen und in nächster Iteration erneut prüfen.
		$url = resolveRelativeUrl($url, $redirectLocation);
		if ($url === false)
		{
			fail(502, 'Invalid redirect target');
		}
		continue;
	}
	break; // fertig
}

if (strlen($body) > MAX_BYTES)
{
	fail(413, 'Response too large');
}

http_response_code($httpCode ?: 200);
header('Content-Type: ' . $contentType);
echo $body;

// Absolute URL aus (evtl. relativer) Redirect-Location + Basis-URL bilden.
function resolveRelativeUrl($base, $rel)
{
	if (parse_url($rel, PHP_URL_SCHEME) !== null)
	{
		return $rel; // schon absolut
	}
	$b = parse_url($base);
	if ($b === false || empty($b['scheme']) || empty($b['host']))
	{
		return false;
	}
	$scheme = $b['scheme'];
	$host = $b['host'];
	$port = isset($b['port']) ? ':' . $b['port'] : '';
	if (strlen($rel) > 0 && $rel[0] === '/')
	{
		$path = $rel;
	}
	else
	{
		$basePath = isset($b['path']) ? $b['path'] : '/';
		$dir = substr($basePath, 0, strrpos($basePath, '/') + 1);
		$path = $dir . $rel;
	}
	return $scheme . '://' . $host . $port . $path;
}
