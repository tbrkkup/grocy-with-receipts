'use strict';

// pdf.js (lokal gebundelt) – Worker setzen
if (typeof pdfjsLib !== 'undefined')
{
	pdfjsLib.GlobalWorkerOptions.workerSrc = U('/js/pdfjs/pdf.worker.min.js');
}

var bpFile = null;
var bpMode = 'text'; // 'text' = digitale Rechnung (PDF), 'vision' = Scan/Foto

function bpSetProgress(pct, label)
{
	$('#bp-progress').removeClass('d-none');
	$('#bp-progress-bar').css('width', pct + '%');
	if (label) { $('#bp-status').html('<div class="text-muted">' + label + '</div>'); }
}

function bpResetZones()
{
	$('#bp-drop-digital, #bp-drop-scan').removeClass('has-file');
	$('#bp-label-digital').text(__t('Drop a PDF here or click'));
	$('#bp-label-scan').text(__t('Drop a PDF or image here or click'));
	$('#bp-input-digital').val('');
	$('#bp-input-scan').val('');
}

function bpIsPdf(f) { return !!f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)); }
function bpIsImage(f) { return !!f && ((f.type && f.type.indexOf('image/') === 0) || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name)); }

function bpSelect(f, mode)
{
	if (!f) { return; }
	if (mode === 'text' && !bpIsPdf(f)) { $('#bp-status').html('<div class="alert alert-danger">' + __t('For digital invoices please choose a PDF file.') + '</div>'); return; }
	if (mode === 'vision' && !bpIsPdf(f) && !bpIsImage(f)) { $('#bp-status').html('<div class="alert alert-danger">' + __t('For scans please choose a PDF or image file.') + '</div>'); return; }
	bpFile = f;
	bpMode = mode;
	bpResetZones();
	if (mode === 'text') { $('#bp-drop-digital').addClass('has-file'); $('#bp-label-digital').text(f.name); }
	else { $('#bp-drop-scan').addClass('has-file'); $('#bp-label-scan').text(f.name); }
	$('#bp-status').html('');
	$('#bp-analyze').prop('disabled', false);
}

function bpBindZone(zoneSel, inputSel, mode)
{
	$(zoneSel).on('click', function() { $(inputSel).trigger('click'); });
	$(zoneSel).on('dragover', function(e) { e.preventDefault(); });
	$(zoneSel).on('drop', function(e) { e.preventDefault(); bpSelect(e.originalEvent.dataTransfer.files[0], mode); });
	$(inputSel).on('change', function(e) { bpSelect(e.target.files[0], mode); });
}
bpBindZone('#bp-drop-digital', '#bp-input-digital', 'text');
bpBindZone('#bp-drop-scan', '#bp-input-scan', 'vision');

// ---- clientseitige Aufbereitung ----
function bpExtractPdfText(file)
{
	return file.arrayBuffer().then(function(buf)
	{
		return pdfjsLib.getDocument({ data: buf }).promise;
	}).then(function(pdf)
	{
		var pages = [];
		for (var i = 1; i <= pdf.numPages; i++) { pages.push(i); }
		return pages.reduce(function(chain, i)
		{
			return chain.then(function(t)
			{
				return pdf.getPage(i).then(function(p) { return p.getTextContent(); }).then(function(c)
				{
					return t + c.items.map(function(x) { return x.str; }).join(' ') + '\n';
				});
			});
		}, Promise.resolve(''));
	});
}

function bpImageToBase64(file)
{
	return new Promise(function(resolve, reject)
	{
		var img = new Image();
		var url = URL.createObjectURL(file);
		img.onload = function()
		{
			URL.revokeObjectURL(url);
			var maxEdge = 1600;
			var w = img.naturalWidth, h = img.naturalHeight;
			if (!w || !h) { reject(new Error('Unreadable image')); return; }
			var scale = Math.min(1, maxEdge / Math.max(w, h));
			var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
			var canvas = document.createElement('canvas');
			canvas.width = cw; canvas.height = ch;
			var ctx = canvas.getContext('2d');
			ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
			ctx.drawImage(img, 0, 0, cw, ch);
			resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
		};
		img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
		img.src = url;
	});
}

function bpPdfToImages(file)
{
	return file.arrayBuffer().then(function(buf)
	{
		return pdfjsLib.getDocument({ data: buf }).promise;
	}).then(function(pdf)
	{
		var maxPages = Math.min(pdf.numPages, 5), pages = [];
		for (var i = 1; i <= maxPages; i++) { pages.push(i); }
		return pages.reduce(function(chain, i)
		{
			return chain.then(function(acc)
			{
				return pdf.getPage(i).then(function(page)
				{
					var vp1 = page.getViewport({ scale: 1 });
					var scale = Math.min(3, 1600 / Math.max(vp1.width, vp1.height)) || 1;
					var vp = page.getViewport({ scale: scale });
					var canvas = document.createElement('canvas');
					canvas.width = Math.max(1, Math.round(vp.width));
					canvas.height = Math.max(1, Math.round(vp.height));
					var ctx = canvas.getContext('2d');
					ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
					return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function()
					{
						acc.push(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
						return acc;
					});
				});
			});
		}, Promise.resolve([]));
	});
}

// ---- Serverseitige Analyse (Phase-0-Endpunkte) ----
function bpApiPost(path, data)
{
	return new Promise(function(resolve, reject)
	{
		Grocy.Api.Post(path, data, function(r) { resolve(r); }, function(xhr) { reject(xhr); });
	});
}

function bpRenderResult(result)
{
	var products = (result && result.products) || [];
	var shopName = result.shop_detected_name || '–';
	var date = result.date_iso || '–';
	var inv = result.invoice_number ? (' · ' + __t('Invoice number') + ': ' + result.invoice_number) : '';
	$('#bp-result-head').text(__t('%s products recognized', products.length) + ' · ' + shopName + ' · ' + date + inv);
	var rows = products.map(function(p)
	{
		var amount = (p.quantity != null ? p.quantity : '') + ' ' + (p.unit || '');
		var price = (p.price_total != null) ? (parseFloat(p.price_total).toFixed(2)) : '';
		return '<tr><td>' + $('<div>').text(p.receipt_text || '').html() + '</td>' +
			'<td>' + $('<div>').text(p.name || '').html() + '</td>' +
			'<td>' + $('<div>').text(amount).html() + '</td>' +
			'<td>' + $('<div>').text(price).html() + '</td></tr>';
	}).join('');
	$('#bp-result-body').html(rows);
	$('#bp-result').removeClass('d-none');
}

$('#bp-analyze').on('click', function()
{
	if (!bpFile) { return; }
	$('#bp-analyze').prop('disabled', true);
	$('#bp-result').addClass('d-none');
	var work;
	if (bpMode === 'text')
	{
		bpSetProgress(15, __t('Reading PDF…'));
		work = bpExtractPdfText(bpFile).then(function(text)
		{
			bpSetProgress(45, __t('Analyzing…'));
			return bpApiPost('receipts/parse-invoice', { text: text });
		});
	}
	else
	{
		bpSetProgress(15, __t('Preparing image…'));
		var imagesPromise = bpIsPdf(bpFile) ? bpPdfToImages(bpFile) : bpImageToBase64(bpFile).then(function(b) { return [b]; });
		work = imagesPromise.then(function(images)
		{
			if (!images || !images.length) { throw new Error(__t('Could not read the file.')); }
			bpSetProgress(45, __t('Analyzing…'));
			return bpApiPost('receipts/parse-scan', { images: images });
		});
	}
	work.then(function(result)
	{
		bpSetProgress(100, '');
		$('#bp-progress').addClass('d-none');
		$('#bp-status').html('');
		bpRenderResult(result);
		$('#bp-analyze').prop('disabled', false);
	}).catch(function(err)
	{
		$('#bp-progress').addClass('d-none');
		var msg = (err && err.response) ? err.response : ((err && err.message) ? err.message : __t('Analysis failed'));
		try { var j = JSON.parse(err.response); if (j.error_message) { msg = j.error_message; } } catch (e) { }
		$('#bp-status').html('<div class="alert alert-danger">' + msg + '</div>');
		$('#bp-analyze').prop('disabled', false);
	});
});
