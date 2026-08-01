<?php

namespace Grocy\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ReceiptsController extends BaseController
{
	public function Overview(Request $request, Response $response, array $args)
	{
		return $this->RenderPage($response, 'receipts', [
			'receipts' => $this->DB->receipts()->orderBy('date', 'DESC'),
			'shoppinglocations' => $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE')
		]);
	}

	public function ReceiptEditForm(Request $request, Response $response, array $args)
	{
		if ($args['receiptId'] == 'new')
		{
			return $this->RenderPage($response, 'receiptform', [
				'mode' => 'create',
				'shoppinglocations' => $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE')
			]);
		}
		else
		{
			$receipt = $this->DB->receipts($args['receiptId']);
			$receiptFiles = $this->DB->receipt_files()->where('receipt_id', $args['receiptId'])->fetchAll();
			$linkedPurchases = $this->DB->stock_log()->where('receipt_id', $args['receiptId'])->orderBy('purchased_date', 'DESC')->fetchAll();

			return $this->RenderPage($response, 'receiptform', [
				'receipt' => $receipt,
				'receiptFiles' => $receiptFiles,
				'linkedPurchases' => $linkedPurchases,
				'mode' => 'edit',
				'shoppinglocations' => $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE')
			]);
		}
	}
}
