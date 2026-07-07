<?php

namespace Grocy\Controllers\Api;

use Grocy\Controllers\Users\User;
use Grocy\Services\ReceiptAnalysisService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Serverseitige Beleg-Analyse für den „Sammeleinkauf".
 * Endpunkte (gemeinsames Antwort-Schema): parse-invoice, parse-scan, match-products,
 * fetch-url, product-from-url, settings. Der Anthropic-Key liegt serverseitig.
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

	public function MatchProducts(Request $request, Response $response, array $args)
	{
		if (!$this->FeatureEnabled())
		{
			return $this->GenericErrorResponse($response, 'Receipt import feature is disabled', 404);
		}
		try
		{
			$body = $this->RawJsonBody($request);
			$products = (isset($body['products']) && is_array($body['products'])) ? $body['products'] : [];
			$result = ReceiptAnalysisService::GetInstance()->MatchProducts($products);
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

	// Holt eine externe http(s)-Ressource serverseitig (umgeht Browser-CORS für „Produkt aus Link"
	// und Bild-Download). SSRF-Härtung liegt zentral im ReceiptAnalysisService.
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
		try
		{
			$data = ReceiptAnalysisService::GetInstance()->FetchUrl($url);
			$response->getBody()->write($data['body']);
			return $response->withStatus($data['status'])->withHeader('Content-Type', $data['content_type']);
		}
		catch (\Exception $ex)
		{
			$code = $ex->getCode();
			return $this->GenericErrorResponse($response, $ex->getMessage(), ($code >= 400 && $code < 600) ? $code : 400);
		}
	}

	// „Produkt aus Link": Seite serverseitig holen + Claude extrahiert Name/Gewicht/Bild-URL.
	public function ProductFromUrl(Request $request, Response $response, array $args)
	{
		if (!$this->FeatureEnabled())
		{
			return $this->GenericErrorResponse($response, 'Receipt import feature is disabled', 404);
		}
		try
		{
			$body = $this->RawJsonBody($request);
			$url = trim(isset($body['url']) ? (string) $body['url'] : '');
			if ($url === '')
			{
				return $this->GenericErrorResponse($response, 'Missing url', 400);
			}
			$info = ReceiptAnalysisService::GetInstance()->ProductFromUrl($url);
			return $this->ApiResponse($response, $info);
		}
		catch (\Exception $ex)
		{
			return $this->GenericErrorResponse($response, $ex->getMessage());
		}
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
