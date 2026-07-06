<?php

namespace Grocy\Controllers\Api;

use Grocy\Controllers\Users\User;
use Grocy\Services\ReceiptAnalysisService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Serverseitige Beleg-Analyse für den „Sammeleinkauf".
 * Zwei getrennte Endpunkte mit gemeinsamem Antwort-Schema:
 *  - POST /api/receipts/parse-invoice  (digitale Rechnung, Body { text })
 *  - POST /api/receipts/parse-scan     (Scan/Foto, Body { images: [base64,...] })
 * Der Anthropic-Key liegt serverseitig (GROCY_ANTHROPIC_API_KEY).
 */
class ReceiptImportApiController extends BaseApiController
{
	public function ParseInvoice(Request $request, Response $response, array $args)
	{
		if (!$this->FeatureEnabled())
		{
			return $this->GenericErrorResponse($response, 'Receipt import feature is disabled', 404);
		}
		try
		{
			$body = $this->RawJsonBody($request);
			$text = isset($body['text']) ? (string) $body['text'] : '';
			$result = ReceiptAnalysisService::GetInstance()->ParseInvoiceText($text);
			return $this->ApiResponse($response, $result);
		}
		catch (\Exception $ex)
		{
			return $this->GenericErrorResponse($response, $ex->getMessage());
		}
	}

	public function ParseScan(Request $request, Response $response, array $args)
	{
		if (!$this->FeatureEnabled())
		{
			return $this->GenericErrorResponse($response, 'Receipt import feature is disabled', 404);
		}
		try
		{
			$body = $this->RawJsonBody($request);
			$images = (isset($body['images']) && is_array($body['images'])) ? $body['images'] : [];
			$result = ReceiptAnalysisService::GetInstance()->ParseScanImages($images);
			return $this->ApiResponse($response, $result);
		}
		catch (\Exception $ex)
		{
			return $this->GenericErrorResponse($response, $ex->getMessage());
		}
	}

	// Speichert die Beleg-Import-Einstellungen als settingoverrides-Dateien (instanzweit,
	// vom Setting()-Mechanismus beim nächsten Request gelesen). Nur Admin.
	public function SaveSettings(Request $request, Response $response, array $args)
	{
		User::CheckPermission($request, User::PERMISSION_ADMIN);
		try
		{
			$body = $this->RawJsonBody($request);
			$dir = GROCY_DATAPATH . '/settingoverrides';
			if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir))
			{
				throw new \Exception('Could not create settingoverrides directory');
			}
			// API-Key nur überschreiben, wenn ein nicht-leerer Wert kommt (leer = unverändert lassen).
			if (isset($body['anthropic_api_key']) && trim((string) $body['anthropic_api_key']) !== '')
			{
				file_put_contents($dir . '/ANTHROPIC_API_KEY.txt', trim((string) $body['anthropic_api_key']));
			}
			if (isset($body['anthropic_model']) && trim((string) $body['anthropic_model']) !== '')
			{
				file_put_contents($dir . '/ANTHROPIC_MODEL.txt', trim((string) $body['anthropic_model']));
			}
			if (isset($body['receipt_digital_backend']) && in_array($body['receipt_digital_backend'], ['anthropic', 'parser'], true))
			{
				file_put_contents($dir . '/RECEIPT_DIGITAL_BACKEND.txt', $body['receipt_digital_backend']);
			}
			return $this->EmptyApiResponse($response);
		}
		catch (\Exception $ex)
		{
			return $this->GenericErrorResponse($response, $ex->getMessage());
		}
	}

	// Holt eine externe http(s)-Ressource serverseitig (umgeht Browser-CORS für „Produkt aus Link").
	// Auth über die Grocy-API (dieser /api-Endpunkt ist bereits geschützt). SSRF-gehärtet:
	// nur öffentliche IPv4, Redirects pro Hop geprüft, Verbindung an die geprüfte IP gepinnt.
	public function FetchUrl(Request $request, Response $response, array $args)
	{
		if (!$this->FeatureEnabled())
		{
			return $this->GenericErrorResponse($response, 'Receipt import feature is disabled', 404);
		}
		$url = trim($request->getQueryParams()['url'] ?? '');
		if ($url === '')
		{
			return $this->GenericErrorResponse($response, 'Missing url parameter', 400);
		}

		$maxBytes = 8 * 1024 * 1024;
		$contentType = 'application/octet-stream';
		$httpCode = 200;
		$bodyData = false;

		for ($hop = 0; $hop <= 4; $hop++)
		{
			$parts = $this->ValidateUrlParts($url);
			if ($parts === false)
			{
				return $this->GenericErrorResponse($response, 'Only absolute http(s) URLs are allowed', 400);
			}
			$host = $parts['host'];
			$scheme = strtolower($parts['scheme']);
			$port = isset($parts['port']) ? (int) $parts['port'] : ($scheme === 'https' ? 443 : 80);
			$pinIp = $this->ResolvePinnedIp($host);
			if ($pinIp === false)
			{
				return $this->GenericErrorResponse($response, 'Target host is not allowed', 403);
			}

			$redirectLocation = null;
			$ch = curl_init($url);
			curl_setopt_array($ch, [
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_FOLLOWLOCATION => false,
				CURLOPT_CONNECTTIMEOUT => 8,
				CURLOPT_TIMEOUT => 15,
				CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GrocyImportBot/1.0)',
				CURLOPT_SSL_VERIFYPEER => true,
				CURLOPT_SSL_VERIFYHOST => 2,
				CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
				CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
				CURLOPT_RESOLVE => [$host . ':' . $port . ':' . $pinIp],
				CURLOPT_NOPROGRESS => false,
				CURLOPT_BUFFERSIZE => 65536,
				CURLOPT_PROGRESSFUNCTION => function ($c, $dt, $dn) use ($maxBytes)
				{
					return ($dn > $maxBytes) ? 1 : 0;
				},
				CURLOPT_HEADERFUNCTION => function ($c, $header) use (&$redirectLocation)
				{
					$p = strpos($header, ':');
					if ($p !== false && strtolower(trim(substr($header, 0, $p))) === 'location')
					{
						$redirectLocation = trim(substr($header, $p + 1));
					}
					return strlen($header);
				},
			]);
			$bodyData = curl_exec($ch);
			if ($bodyData === false)
			{
				$err = curl_error($ch);
				curl_close($ch);
				return $this->GenericErrorResponse($response, 'Fetch failed: ' . $err, 502);
			}
			$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
			$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/octet-stream';
			curl_close($ch);

			if ($httpCode >= 300 && $httpCode < 400 && $redirectLocation)
			{
				$url = $this->ResolveRelativeUrl($url, $redirectLocation);
				if ($url === false)
				{
					return $this->GenericErrorResponse($response, 'Invalid redirect target', 502);
				}
				continue;
			}
			break;
		}

		if (strlen($bodyData) > $maxBytes)
		{
			return $this->GenericErrorResponse($response, 'Response too large', 413);
		}
		$response->getBody()->write($bodyData);
		return $response->withStatus($httpCode ?: 200)->withHeader('Content-Type', $contentType);
	}

	private function ValidateUrlParts($url)
	{
		$parts = parse_url($url);
		if ($parts === false || empty($parts['scheme']) || empty($parts['host']) ||
			!in_array(strtolower($parts['scheme']), ['http', 'https'], true))
		{
			return false;
		}
		return $parts;
	}

	private function IpAllowed($ip)
	{
		return (bool) filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
	}

	private function ResolvePinnedIp($host)
	{
		if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6))
		{
			return false;
		}
		if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4))
		{
			return $this->IpAllowed($host) ? $host : false;
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
			if (!$this->IpAllowed($ip))
			{
				return false;
			}
			if ($pin === null)
			{
				$pin = $ip;
			}
		}
		return $pin;
	}

	private function ResolveRelativeUrl($base, $rel)
	{
		if (parse_url($rel, PHP_URL_SCHEME) !== null)
		{
			return $rel;
		}
		$b = parse_url($base);
		if ($b === false || empty($b['scheme']) || empty($b['host']))
		{
			return false;
		}
		$port = isset($b['port']) ? ':' . $b['port'] : '';
		if (strlen($rel) > 0 && $rel[0] === '/')
		{
			$path = $rel;
		}
		else
		{
			$basePath = isset($b['path']) ? $b['path'] : '/';
			$path = substr($basePath, 0, strrpos($basePath, '/') + 1) . $rel;
		}
		return $b['scheme'] . '://' . $b['host'] . $port . $path;
	}

	private function FeatureEnabled()
	{
		return !defined('GROCY_FEATURE_FLAG_RECEIPT_IMPORT') || GROCY_FEATURE_FLAG_RECEIPT_IMPORT;
	}

	// Rohen JSON-Body lesen (nicht GetParsedAndFilteredRequestBody, da HTMLPurifier
	// den langen Text / die Base64-Bilder verfälschen würde).
	private function RawJsonBody(Request $request)
	{
		$parsed = $request->getParsedBody();
		if (is_array($parsed))
		{
			return $parsed;
		}
		$raw = (string) $request->getBody();
		$data = json_decode($raw, true);
		return is_array($data) ? $data : [];
	}
}
