@extends('layout.default')

@section('title', $__t('Bulk purchase'))

@push('pageStyles')
<style>
	.bp-drop { border: 2px dashed var(--bs-border-color, #ced4da); border-radius: 12px; padding: 1.5rem 1rem; text-align: center; cursor: pointer; }
	.bp-drop:hover { border-color: #16a34a; background: rgba(22,163,74,0.05); }
	.bp-drop.has-file { border-color: #16a34a; background: rgba(22,163,74,0.08); }
	.bp-drop .bp-icon { font-size: 30px; margin-bottom: 6px; color: #6c757d; }
	.bp-drop .bp-title { font-weight: 600; }
	.bp-drop .bp-sub { font-size: 12px; color: #6c757d; }
</style>
@endpush

@push('pageScripts')
<script src="{{ $U('/js/pdfjs/pdf.min.js?v=', true) }}{{ $version }}"></script>
@endpush

@section('content')
<div class="row">
	<div class="col">
		<h2 class="title">@yield('title')</h2>
	</div>
</div>

<hr class="my-2">

<div class="row">
	<div class="col-lg-9 col-12">

		@if(!$keyConfigured)
		<div class="alert alert-warning">
			<i class="fa-solid fa-triangle-exclamation"></i>
			{{ $__t('No Anthropic API key is configured yet. It is required to analyze receipts.') }}
			<a href="{{ $U('/receiptimportsettings') }}"
				class="alert-link">{{ $__t('Open settings') }}</a>
		</div>
		@endif

		<p class="sub">{{ $__t('Choose a digital invoice (PDF) on the left or a scanned/photographed receipt on the right.') }}</p>

		<div class="row" id="bp-upload-row">
			<div class="col-md-6 col-12 mb-3">
				<div class="bp-drop" id="bp-drop-digital">
					<div class="bp-icon"><i class="fa-solid fa-file-pdf"></i></div>
					<div class="bp-title">{{ $__t('Digital invoice') }}</div>
					<div id="bp-label-digital">{{ $__t('Drop a PDF here or click') }}</div>
					<div class="bp-sub">{{ $__t('PDF only · text extraction') }}</div>
				</div>
				<input type="file" id="bp-input-digital" accept=".pdf" class="d-none">
			</div>
			<div class="col-md-6 col-12 mb-3">
				<div class="bp-drop" id="bp-drop-scan">
					<div class="bp-icon"><i class="fa-solid fa-camera"></i></div>
					<div class="bp-title">{{ $__t('Scanned / photographed') }}</div>
					<div id="bp-label-scan">{{ $__t('Drop a PDF or image here or click') }}</div>
					<div class="bp-sub">{{ $__t('PDF or image · Claude Vision') }}</div>
				</div>
				<input type="file" id="bp-input-scan" accept=".pdf,image/*" class="d-none">
			</div>
		</div>

		<div class="btn-row mt-1">
			<button class="btn btn-primary" id="bp-analyze" disabled>{{ $__t('Analyze') }}</button>
		</div>

		<div id="bp-status" class="mt-3"></div>

		<div class="progress mt-3 d-none" id="bp-progress">
			<div class="progress-bar" id="bp-progress-bar" role="progressbar" style="width: 0%"></div>
		</div>

		<div id="bp-result" class="mt-4 d-none">
			<h4 id="bp-result-head"></h4>
			<table class="table table-sm table-striped w-100 mt-2">
				<thead>
					<tr>
						<th>{{ $__t('Receipt text') }}</th>
						<th>{{ $__t('Product') }}</th>
						<th>{{ $__t('Amount') }}</th>
						<th>{{ $__t('Price') }}</th>
					</tr>
				</thead>
				<tbody id="bp-result-body"></tbody>
			</table>
			<p class="text-muted font-italic">{{ $__t('Next: review, correct and book these into stock (coming next).') }}</p>
		</div>

	</div>
</div>
@stop
