<?php

namespace Grocy\Controllers;

use Grocy\Services\UserfieldsService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class EquipmentController extends BaseController
{
	protected $UserfieldsService;

	public function EditForm(Request $request, Response $response, array $args)
	{
		if ($args['equipmentId'] == 'new')
		{
			return $this->RenderPage($response, 'equipmentform', [
				'mode' => 'create',
				'userfields' => UserfieldsService::GetInstance()->GetFields('equipment'),
				'locations' => $this->DB->locations()->where('active = 1')->orderBy('name', 'COLLATE NOCASE'),
				'equipmentgroups' => $this->DB->equipment_groups()->where('active = 1')->orderBy('name', 'COLLATE NOCASE'),
				'receipts' => $this->DB->receipts()->orderBy('date', 'DESC'),
				'shoppinglocations' => $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE')
			]);
		}
		else
		{
			return $this->RenderPage($response, 'equipmentform', [
				'equipment' => $this->DB->equipment($args['equipmentId']),
				'mode' => 'edit',
				'userfields' => UserfieldsService::GetInstance()->GetFields('equipment'),
				'locations' => $this->DB->locations()->where('active = 1')->orderBy('name', 'COLLATE NOCASE'),
				'equipmentgroups' => $this->DB->equipment_groups()->where('active = 1')->orderBy('name', 'COLLATE NOCASE'),
				'receipts' => $this->DB->receipts()->orderBy('date', 'DESC'),
				'shoppinglocations' => $this->DB->shopping_locations()->orderBy('name', 'COLLATE NOCASE')
			]);
		}
	}

	public function Overview(Request $request, Response $response, array $args)
	{
		return $this->RenderPage($response, 'equipment', [
			'equipment' => $this->DB->equipment()->orderBy('name', 'COLLATE NOCASE'),
			'locations' => $this->DB->locations()->orderBy('name', 'COLLATE NOCASE'),
			'equipmentgroups' => $this->DB->equipment_groups()->orderBy('name', 'COLLATE NOCASE'),
			'userfields' => UserfieldsService::GetInstance()->GetFields('equipment'),
			'userfieldValues' => UserfieldsService::GetInstance()->GetAllValues('equipment')
		]);
	}

	public function EquipmentGroupEditForm(Request $request, Response $response, array $args)
	{
		if ($args['equipmentGroupId'] == 'new')
		{
			return $this->RenderPage($response, 'equipmentgroupform', [
				'mode' => 'create',
				'userfields' => UserfieldsService::GetInstance()->GetFields('equipment_groups')
			]);
		}
		else
		{
			return $this->RenderPage($response, 'equipmentgroupform', [
				'group' => $this->DB->equipment_groups($args['equipmentGroupId']),
				'mode' => 'edit',
				'userfields' => UserfieldsService::GetInstance()->GetFields('equipment_groups')
			]);
		}
	}

	public function EquipmentGroupsList(Request $request, Response $response, array $args)
	{
		if (isset($request->getQueryParams()['include_disabled']))
		{
			$equipmentGroups = $this->DB->equipment_groups()->orderBy('name', 'COLLATE NOCASE');
		}
		else
		{
			$equipmentGroups = $this->DB->equipment_groups()->where('active = 1')->orderBy('name', 'COLLATE NOCASE');
		}

		return $this->RenderPage($response, 'equipmentgroups', [
			'equipmentGroups' => $equipmentGroups,
			'equipment' => $this->DB->equipment()->orderBy('name', 'COLLATE NOCASE'),
			'userfields' => UserfieldsService::GetInstance()->GetFields('equipment_groups'),
			'userfieldValues' => UserfieldsService::GetInstance()->GetAllValues('equipment_groups')
		]);
	}
}
