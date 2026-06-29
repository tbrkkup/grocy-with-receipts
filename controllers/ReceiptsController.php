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
			'shoppingLocations' => $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE'),
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
		]);
	}
}
