<?php

namespace Grocy\Services;

use GuzzleHttp\Client;

/**
 * Serverseitige Beleg-Analyse für den „Sammeleinkauf" (Phase 0 der nativen Integration).
 *
 * Zwei getrennte Einstiege mit gemeinsamem Antwort-Schema:
 *  - ParseInvoiceText($text)   → digitale Rechnung (Backend über GROCY_RECEIPT_DIGITAL_BACKEND
 *                                austauschbar; heute Anthropic Text-Prompt)
 *  - ParseScanImages($images)  → gescannter/fotografierter Beleg (Anthropic Vision)
 *
 * Beide liefern: shop_detected_name, shop_matched_id, date_iso, invoice_number,
 * products[] (mit receipt_text als stabilem Alias-Schlüssel) → identischer Downstream,
 * beide füttern gleichermaßen das Lern-Wörterbuch (product_receipt_aliases).
 *
 * Der Anthropic-Key liegt serverseitig (GROCY_ANTHROPIC_API_KEY) – nicht mehr im Browser.
 */
class ReceiptAnalysisService extends BaseService
{
	const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

	public function ParseInvoiceText(string $text)
	{
		$text = trim($text);
		if ($text === '')
		{
			throw new \Exception('No invoice text provided');
		}

		$backend = defined('GROCY_RECEIPT_DIGITAL_BACKEND') ? GROCY_RECEIPT_DIGITAL_BACKEND : 'anthropic';
		if ($backend !== 'anthropic')
		{
			// Platzhalter für den späteren regelbasierten Parser (z. B. ZUGFeRD/XRechnung).
			throw new \Exception('Digital backend "' . $backend . '" is not implemented yet');
		}

		$prompt = $this->BuildInvoicePrompt() . "\n\nRECHNUNGSTEXT:\n" . mb_substr($text, 0, 8000);
		$raw = $this->CallAnthropic([
			['role' => 'user', 'content' => $prompt]
		], 3000);
		return $this->NormalizeResult($raw);
	}

	public function ParseScanImages(array $images)
	{
		$images = array_values(array_filter($images, function ($i)
		{
			return is_string($i) && $i !== '';
		}));
		if (count($images) === 0)
		{
			throw new \Exception('No images provided');
		}
		if (count($images) > 8)
		{
			$images = array_slice($images, 0, 8);
		}

		$content = [];
		foreach ($images as $b64)
		{
			$content[] = [
				'type' => 'image',
				'source' => ['type' => 'base64', 'media_type' => 'image/jpeg', 'data' => $b64]
			];
		}
		$content[] = ['type' => 'text', 'text' => $this->BuildScanPrompt(count($images))];

		$raw = $this->CallAnthropic([
			['role' => 'user', 'content' => $content]
		], 3000);
		return $this->NormalizeResult($raw);
	}

	// Semantisches Produkt-Matching (Claude Call 2): ordnet erkannte Positionen den
	// vorhandenen Grocy-Produkten zu. Gibt [{index, matched_id}] zurück.
	public function MatchProducts(array $products)
	{
		$products = array_values($products);
		if (count($products) === 0)
		{
			return [];
		}
		$productList = [];
		foreach ($this->DB->products() as $p)
		{
			$productList[] = ['id' => $p->id, 'name' => $p->name];
		}
		$extracted = [];
		foreach ($products as $i => $p)
		{
			$extracted[] = ['index' => $i, 'name' => isset($p['name']) ? $p['name'] : ''];
		}
		$prompt =
			"Ordne jedes erkannte Produkt dem semantisch besten passenden Grocy-Produkt zu.\n" .
			"Berücksichtige: andere Wortstellung, Synonyme, Abkürzungen, bio-Zusätze.\n" .
			"Beispiele: \"Reis rot bio\"→\"Roter Reis\" | \"Oliven grün Kalamata entsteint\"→\"Oliven, grün, Kalamata\"\n" .
			"Antworte NUR mit JSON-Array:\n[{\"index\":0,\"matched_id\":123},...]\n" .
			"matched_id ist null wenn kein passendes Produkt existiert.\n\n" .
			"Erkannte Produkte:\n" . json_encode($extracted, JSON_UNESCAPED_UNICODE) . "\n\n" .
			"Grocy-Produkte:\n" . json_encode($productList, JSON_UNESCAPED_UNICODE);
		$raw = $this->CallAnthropic([['role' => 'user', 'content' => $prompt]], 1200);
		$clean = trim(str_replace(['```json', '```'], '', $raw));
		$matches = json_decode($clean, true);
		return is_array($matches) ? $matches : [];
	}

	// ---- Anthropic-Aufruf ----
	private function CallAnthropic(array $messages, int $maxTokens)
	{
		$apiKey = defined('GROCY_ANTHROPIC_API_KEY') ? GROCY_ANTHROPIC_API_KEY : '';
		if ($apiKey === '' || $apiKey === null)
		{
			throw new \Exception('Anthropic API key is not configured (set GROCY_ANTHROPIC_API_KEY)');
		}
		$model = defined('GROCY_ANTHROPIC_MODEL') ? GROCY_ANTHROPIC_MODEL : 'claude-sonnet-4-6';

		$client = new Client();
		$res = $client->post(self::ANTHROPIC_URL, [
			'headers' => [
				'x-api-key' => $apiKey,
				'anthropic-version' => '2023-06-01',
				'content-type' => 'application/json'
			],
			'json' => [
				'model' => $model,
				'max_tokens' => $maxTokens,
				'messages' => $messages
			],
			'timeout' => 90,
			'http_errors' => false
		]);

		$status = $res->getStatusCode();
		$body = (string) $res->getBody();
		$data = json_decode($body, true);
		if ($status < 200 || $status >= 300)
		{
			$msg = (is_array($data) && isset($data['error']['message'])) ? $data['error']['message'] : ('Anthropic HTTP ' . $status);
			throw new \Exception($msg);
		}
		$text = '';
		if (is_array($data) && isset($data['content']) && is_array($data['content']))
		{
			foreach ($data['content'] as $block)
			{
				if (isset($block['text']))
				{
					$text .= $block['text'];
				}
			}
		}
		return $text;
	}

	// ---- Ergebnis normalisieren (gemeinsam für beide Pfade) ----
	private function NormalizeResult(string $raw)
	{
		$clean = trim(str_replace(['```json', '```'], '', $raw));
		$result = json_decode($clean, true);
		if (!is_array($result))
		{
			throw new \Exception('Could not parse analysis result as JSON');
		}
		if (!isset($result['products']) || !is_array($result['products']))
		{
			$result['products'] = [];
		}
		$this->ApplyShopFallback($result);
		return $result;
	}

	private function ShopList()
	{
		$shops = [];
		foreach ($this->DB->shopping_locations() as $s)
		{
			$shops[] = ['id' => $s->id, 'name' => $s->name];
		}
		return $shops;
	}

	private function NormalizeShopName($name)
	{
		if (!$name)
		{
			return '';
		}
		$c = preg_replace('/([\p{L}])\s(?=[\p{L}])/u', '$1', $name);
		$c = preg_replace('/\b(GmbH|KG|AG|e\.K\.|eG|OHG|UG|Co\.?|&)\b/iu', '', $c);
		$c = preg_replace('/\s+/u', ' ', $c);
		return mb_strtolower(trim($c));
	}

	// Clientseitiger Geschäfts-Fallback, falls das Modell shop_matched_id nicht gesetzt hat.
	private function ApplyShopFallback(array &$result)
	{
		if (!empty($result['shop_matched_id']) || empty($result['shop_detected_name']))
		{
			return;
		}
		$nd = $this->NormalizeShopName($result['shop_detected_name']);
		$best = null;
		$bestScore = 0;
		foreach ($this->ShopList() as $shop)
		{
			$ns = $this->NormalizeShopName($shop['name']);
			$score = 0;
			if ($ns !== '' && ($nd !== '' && (strpos($nd, $ns) !== false || strpos($ns, $nd) !== false)))
			{
				$score = 0.9;
			}
			else
			{
				$wd = preg_split('/\s+/', $nd);
				$ws = preg_split('/\s+/', $ns);
				$hits = 0;
				foreach ($ws as $w)
				{
					if (mb_strlen($w) > 2)
					{
						foreach ($wd as $d)
						{
							if ($d !== '' && (strpos($d, $w) !== false || strpos($w, $d) !== false))
							{
								$hits++;
								break;
							}
						}
					}
				}
				$score = count($ws) > 0 ? $hits / count($ws) : 0;
			}
			if ($score > $bestScore)
			{
				$bestScore = $score;
				$best = $shop;
			}
		}
		if ($bestScore > 0.5 && $best !== null)
		{
			$result['shop_matched_id'] = $best['id'];
		}
	}

	// ---- Prompts (serverseitig, an die Widget-Prompts angelehnt) ----
	private function FormatBlock()
	{
		$shopListJson = json_encode($this->ShopList(), JSON_UNESCAPED_UNICODE);
		return
			"FORMAT:\n" .
			"{\n" .
			'  "shop_detected_name": "string oder null",' . "\n" .
			'  "shop_matched_id": null,' . "\n" .
			'  "date_iso": "YYYY-MM-DD oder null",' . "\n" .
			'  "invoice_number": "string oder null",' . "\n" .
			'  "products": [' . "\n" .
			'    {"receipt_text":"exakt wie gedruckt","name":"lesbarer Name","quantity":1.0,"unit":"kg","price_total":0.00,"price_per_unit":0.00}' . "\n" .
			"  ]\n" .
			"}\n\n" .
			"receipt_text = der Produkttext GENAU wie gedruckt (inkl. Kürzel). name = daraus abgeleiteter lesbarer Name.\n\n" .
			"MENGEN/EINHEITEN: erlaubte Einheiten kg,g,l,ml,Stueck,Packung. Gewichts-/Volumenware als quantity+unit. Komma=Dezimalpunkt (\"2,5\"=2.5). Ohne Menge: quantity 1, unit \"Stueck\".\n" .
			"- STEUERKENNZEICHEN am Zeilenende (Buchstabe A/B ODER Ziffer 1/2, Verweis auf \"MwSt-Satz\" wie \"1=19,00%\") ist KEINE Menge/kein Multiplikator.\n" .
			"- Mengen-Multiplikator steht am ZeilenANFANG als \"Nx Einzelpreis\" (\"6x 1,85 …\") → quantity=N. Zahlen im Namen (\"8x220\",\"190g\") sind KEINE Menge.\n\n" .
			"RABATTE: \"Rabatt\"/\"Nachlass\"/negative Beträge sind KEINE eigenen Produkte – vom Produkt darüber (gelegentlich darunter) abziehen, NETTO-price_total zurückgeben, nie als eigenen Eintrag.\n\n" .
			"GESCHÄFT: Firmenzusätze (GmbH/KG/AG/eG/e.K.) ignorieren. Grocy-Geschäfte: " . $shopListJson . " – großzügig/case-insensitiv vergleichen, passende id in shop_matched_id, sonst null.\n" .
			"DATUM: DD.MM.YYYY / DD.MM.YY (zweistellig 00-30 = 2000-2030).\n" .
			"RECHNUNGSNUMMER: \"Rechnungsnummer\"/\"Beleg-Nr.\" exakt übernehmen, nicht mit Kunden-/Trace-Nr. verwechseln, sonst null.\n";
	}

	private function BuildInvoicePrompt()
	{
		return "Du analysierst einen deutschen Rechnungstext. Antworte NUR mit einem JSON-Objekt, kein Markdown.\n\n" . $this->FormatBlock();
	}

	private function BuildScanPrompt($imageCount)
	{
		$multi = $imageCount > 1
			? "HINWEIS: Es liegen $imageCount Bilder/Seiten desselben Belegs vor – berücksichtige ALLE und gib EINE gemeinsame products-Liste zurück.\n\n"
			: '';
		return "Du liest das Foto/den Scan eines deutschen Supermarkt-Kassenbons. Antworte NUR mit einem JSON-Objekt, kein Markdown.\n\n" .
			$multi .
			$this->FormatBlock() .
			"\nBON-LAYOUT: Produktname und Mengenzeile stehen oft getrennt; Betrag rechts. Nimm NUR echte Einkaufspositionen. Ignoriere SUMME/Zu zahlender Betrag, Zahlart (BAR/EC), Geschenkkarte/Gutschein-Zahlungen, Rückgeld/Auszahlung, PAYBACK, UID/Beleg-/TSE-/Trace-Nr., Kopf-/Fußzeilen.\n";
	}
}
