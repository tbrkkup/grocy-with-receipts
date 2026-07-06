<?php
/**
 * url-proxy.php – kleiner serverseitiger Abruf-Proxy für das Import-Widget.
 *
 * Zweck: Das Browser-Widget (grocy-import.html) darf fremde Produktseiten/Bilder
 * wegen CORS nicht direkt laden. Diese Datei holt eine per ?url=... übergebene
 * http(s)-Ressource serverseitig und gibt sie mit ihrem Content-Type zurück.
 *
 * Deploy: wie grocy-import.html nach /var/www/grocy/public/ kopieren. Sie wird von
 * nginx+PHP-FPM direkt ausgeliefert (try_files trifft die reale Datei vor index.php).
 *
 * Sicherheit: nur http/https, keine privaten/lokalen IPs (SSRF-Schutz), 15s Timeout,
 * max. 8 MB, max. 5 Redirects. Für den privaten Eigengebrauch gedacht.
 */

header('Access-Control-Allow-Origin: *');

$url = isset($_GET['url']) ? trim($_GET['url']) : '';
if ($url === '')
{
	http_response_code(400);
	header('Content-Type: text/plain; charset=utf-8');
	echo 'Missing url parameter';
	exit;
}

$parts = parse_url($url);
if ($parts === false || empty($parts['scheme']) || empty($parts['host']) ||
	!in_array(strtolower($parts['scheme']), ['http', 'https'], true))
{
	http_response_code(400);
	header('Content-Type: text/plain; charset=utf-8');
	echo 'Only absolute http(s) URLs are allowed';
	exit;
}

// SSRF-Schutz: Ziel-Host darf nicht auf eine private/lokale/reservierte IP zeigen.
$host = $parts['host'];
$ips = [];
$resolved = @gethostbynamel($host);
if ($resolved !== false)
{
	$ips = $resolved;
}
elseif (filter_var($host, FILTER_VALIDATE_IP))
{
	$ips = [$host];
}
if (empty($ips))
{
	http_response_code(502);
	header('Content-Type: text/plain; charset=utf-8');
	echo 'Could not resolve host';
	exit;
}
foreach ($ips as $ip)
{
	if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE))
	{
		http_response_code(403);
		header('Content-Type: text/plain; charset=utf-8');
		echo 'Target host is not allowed';
		exit;
	}
}

$maxBytes = 8 * 1024 * 1024;

$ch = curl_init($url);
curl_setopt_array($ch, [
	CURLOPT_RETURNTRANSFER => true,
	CURLOPT_FOLLOWLOCATION => true,
	CURLOPT_MAXREDIRS => 5,
	CURLOPT_CONNECTTIMEOUT => 8,
	CURLOPT_TIMEOUT => 15,
	CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GrocyImportBot/1.0)',
	CURLOPT_SSL_VERIFYPEER => true,
	CURLOPT_SSL_VERIFYHOST => 2,
	CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
	CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
	CURLOPT_BUFFERSIZE => 65536,
	CURLOPT_NOPROGRESS => false,
	CURLOPT_PROGRESSFUNCTION => function ($ch, $dltotal, $dlnow) use ($maxBytes)
	{
		return ($dlnow > $maxBytes) ? 1 : 0;
	},
]);

$body = curl_exec($ch);
if ($body === false)
{
	http_response_code(502);
	header('Content-Type: text/plain; charset=utf-8');
	echo 'Fetch failed: ' . curl_error($ch);
	curl_close($ch);
	exit;
}

$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (strlen($body) > $maxBytes)
{
	http_response_code(413);
	header('Content-Type: text/plain; charset=utf-8');
	echo 'Response too large';
	exit;
}

http_response_code($httpCode ?: 200);
header('Content-Type: ' . ($contentType ?: 'application/octet-stream'));
echo $body;
