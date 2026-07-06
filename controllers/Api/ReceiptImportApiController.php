<?php

namespace Grocy\Controllers\Api;

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
