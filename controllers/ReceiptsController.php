<?php

namespace Grocy\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ReceiptsController extends BaseController
{
	public function Overview(Request $request, Response $response, array $args)
	{
		$receiptFilesByReceiptId = [];
		foreach ($this->DB->receipt_files()->orderBy('id') as $receiptFile)
		{
			$receiptFilesByReceiptId[$receiptFile->receipt_id][] = $receiptFile;
		}

		return $this->RenderPage($response, 'receipts', [
			'receipts' => $this->DB->receipts()->orderBy('date', 'DESC'),
			'shoppingLocations' => $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE'),
			'receiptFilesByReceiptId' => $receiptFilesByReceiptId,
		]);
	}

	public function ReceiptEditForm(Request $request, Response $response, array $args)
	{
		$shoppingLocations = $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE');

		if ($args['receiptId'] == 'new')
		{
			return $this->RenderPage($response, 'receiptform', [
				'mode' => 'create',
				'shoppingLocations' => $shoppingLocations,
			]);
		}

		return $this->RenderPage($response, 'receiptform', [
			'mode' => 'edit',
			'receipt' => $this->DB->receipts($args['receiptId']),
			'receiptFiles' => $this->DB->receipt_files()->where('receipt_id = ?', $args['receiptId']),
			'shoppingLocations' => $shoppingLocations,
			'linkedEquipment' => $this->DB->equipment()->where('receipt_id = ?', $args['receiptId'])->orderBy('name', 'COLLATE NOCASE'),
			'linkedStockEntries' => $this->DB->stock()->where('receipt_id = ?', $args['receiptId'])->orderBy('purchased_date', 'DESC')->fetchAll(),
			'products' => $this->DB->products()->orderBy('name', 'COLLATE NOCASE'),
			'quantityUnits' => $this->DB->quantity_units()->orderBy('name', 'COLLATE NOCASE'),
		]);
	}

	public function ReceiptAliasesList(Request $request, Response $response, array $args)
	{
		$countryNamesById = [];
		foreach ($this->DB->countries() as $country)
		{
			$countryNamesById[$country->id] = $country->name;
		}

		$qualityNamesById = [];
		foreach ($this->DB->qualities() as $quality)
		{
			$qualityNamesById[$quality->id] = $quality->name;
		}

		// "Bio, Rohkost" je Alias, aus einer Abfrage statt einer je Zeile
		$qualityNamesByAliasId = [];
		foreach ($this->DB->product_receipt_alias_qualities() as $link)
		{
			if (isset($qualityNamesById[$link->quality_id]))
			{
				$qualityNamesByAliasId[$link->alias_id][] = $qualityNamesById[$link->quality_id];
			}
		}

		$qualityLabelsByAliasId = [];
		foreach ($qualityNamesByAliasId as $aliasId => $names)
		{
			sort($names);
			$qualityLabelsByAliasId[$aliasId] = implode(', ', $names);
		}

		return $this->RenderPage($response, 'receiptaliases', [
			'aliases' => $this->DB->product_receipt_aliases()->orderBy('times_confirmed', 'DESC')->fetchAll(),
			'countryNamesById' => $countryNamesById,
			'qualityLabelsByAliasId' => $qualityLabelsByAliasId,
			'products' => $this->DB->products()->orderBy('name', 'COLLATE NOCASE')->fetchAll(),
			'shoppingLocations' => $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE')->fetchAll(),
		]);
	}

	public function ReceiptImportSettings(Request $request, Response $response, array $args)
	{
		$keyConfigured = defined('GROCY_ANTHROPIC_API_KEY') && trim((string) GROCY_ANTHROPIC_API_KEY) !== '';
		return $this->RenderPage($response, 'receiptimportsettings', [
			'keyConfigured' => $keyConfigured,
			'model' => defined('GROCY_ANTHROPIC_MODEL') ? GROCY_ANTHROPIC_MODEL : 'claude-sonnet-4-6',
			'digitalBackend' => defined('GROCY_RECEIPT_DIGITAL_BACKEND') ? GROCY_RECEIPT_DIGITAL_BACKEND : 'anthropic',
		]);
	}

	public function BulkPurchase(Request $request, Response $response, array $args)
	{
		$keyConfigured = defined('GROCY_ANTHROPIC_API_KEY') && trim((string) GROCY_ANTHROPIC_API_KEY) !== '';
		return $this->RenderPage($response, 'bulkpurchase', [
			'keyConfigured' => $keyConfigured,
		]);
	}
}
