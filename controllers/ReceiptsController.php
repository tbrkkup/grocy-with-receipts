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
}
