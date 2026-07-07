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

// ---- Master data (products/shops/units/locations) ----
var bpMaster = { products: [], shops: [], units: [], kgUnitId: null, defaultQuId: null, defaultLocationId: null };
function bpApiGet(path)
{
	return new Promise(function(resolve, reject) { Grocy.Api.Get(path, function(r) { resolve(r); }, function(x) { reject(x); }); });
}
var bpMasterReady = Promise.all([
	bpApiGet('objects/products'), bpApiGet('objects/shopping_locations'),
	bpApiGet('objects/quantity_units'), bpApiGet('objects/locations')
]).then(function(res)
{
	bpMaster.products = res[0] || []; bpMaster.shops = res[1] || []; bpMaster.units = res[2] || [];
	var locs = res[3] || [];
	bpMaster.units.forEach(function(u) { if (u.name && u.name.toLowerCase() === 'kg') { bpMaster.kgUnitId = u.id; } });
	bpMaster.defaultQuId = bpMaster.kgUnitId || (bpMaster.units[0] && bpMaster.units[0].id) || null;
	var keller = null; locs.forEach(function(l) { if (l.name && l.name.toLowerCase() === 'keller') { keller = l.id; } });
	bpMaster.defaultLocationId = keller || (locs[0] && locs[0].id) || null;
}).catch(function() { });

var BP_UNITS = ['kg', 'g', 'l', 'ml', 'Stueck', 'Packung'];
var bpData = [];

function bpNormAlias(s) { return s ? String(s).toUpperCase().replace(/\s+/g, ' ').trim() : ''; }
function bpEsc(s) { return $('<div>').text(s == null ? '' : s).html(); }

// ---- Phase 3: matching + review ----
function bpBuildReview(result)
{
	var products = result.products || [];
	bpFillReviewMeta(result);
	return bpApiGet('objects/product_receipt_aliases').catch(function() { return []; }).then(function(aliases)
	{
		aliases = Array.isArray(aliases) ? aliases : [];
		var shopId = $('#bp-shop').val();
		bpData = products.map(function(p)
		{
			var key = bpNormAlias(p.receipt_text || p.name);
			var hit = bpFindAlias(aliases, key, shopId);
			return {
				receipt_text: p.receipt_text || '', name: p.name || '',
				quantity: (p.quantity != null ? p.quantity : 1), unit: p.unit || 'Stueck',
				price_total: (p.price_total != null ? p.price_total : null),
				matchId: hit ? hit.product_id : null, fromAlias: !!hit, skip: false
			};
		});
		var toMatch = [], idx = [];
		bpData.forEach(function(r, i) { if (r.matchId == null) { toMatch.push({ name: r.name }); idx.push(i); } });
		if (toMatch.length === 0) { return; }
		return bpApiPost('receipts/match-products', { products: toMatch }).then(function(matches)
		{
			(matches || []).forEach(function(m) { var i = idx[m.index]; if (i != null && m.matched_id) { bpData[i].matchId = m.matched_id; } });
		}).catch(function() { /* matching optional (e.g. no key) */ });
	}).then(function() { bpRenderReview(); });
}

function bpFindAlias(aliases, key, shopId)
{
	var best = null;
	aliases.forEach(function(a)
	{
		if (bpNormAlias(a.alias) !== key) { return; }
		var ok = (a.shopping_location_id == null) || (shopId && String(a.shopping_location_id) === String(shopId));
		if (!ok) { return; }
		if (!best) { best = a; return; }
		var aS = a.shopping_location_id != null ? 1 : 0, bS = best.shopping_location_id != null ? 1 : 0;
		if (aS !== bS) { if (aS > bS) { best = a; } }
		else if ((parseInt(a.times_confirmed, 10) || 0) > (parseInt(best.times_confirmed, 10) || 0)) { best = a; }
	});
	return best;
}

function bpFillReviewMeta(result)
{
	var opts = '<option value="">' + __t('None') + '</option>';
	bpMaster.shops.forEach(function(s) { opts += '<option value="' + s.id + '">' + bpEsc(s.name) + '</option>'; });
	$('#bp-shop').html(opts);
	if (result.shop_matched_id) { $('#bp-shop').val(result.shop_matched_id); }
	$('#bp-date').val(result.date_iso || new Date().toISOString().slice(0, 10));
	$('#bp-invoice').val(result.invoice_number || '');
}

function bpProductOptions(matchId, suggestedName)
{
	var o = '<option value="__new__">' + __t('Create new') + (suggestedName ? (': ' + bpEsc(suggestedName)) : '') + '</option>';
	bpMaster.products.forEach(function(p) { o += '<option value="' + p.id + '"' + (String(matchId) === String(p.id) ? ' selected' : '') + '>' + bpEsc(p.name) + '</option>'; });
	return o;
}
function bpUnitOptions(cur) { return BP_UNITS.map(function(u) { return '<option value="' + u + '"' + (u === cur ? ' selected' : '') + '>' + u + '</option>'; }).join(''); }

function bpRenderReview()
{
	$('#bp-review-head').text(__t('%s products recognized', bpData.length));
	var rows = bpData.map(function(r, i)
	{
		return '<tr data-i="' + i + '">' +
			'<td>' + bpEsc(r.receipt_text || r.name) + (r.fromAlias ? ' <span class="badge badge-info">' + __t('Learned') + '</span>' : '') + '</td>' +
			'<td><select class="custom-control custom-select bp-prod" data-i="' + i + '">' + bpProductOptions(r.matchId, r.name) + '</select></td>' +
			'<td><input type="number" step="any" min="0" class="form-control bp-qty" data-i="' + i + '" value="' + r.quantity + '" style="min-width:80px"></td>' +
			'<td><select class="custom-control custom-select bp-unit" data-i="' + i + '">' + bpUnitOptions(r.unit) + '</select></td>' +
			'<td><input type="number" step="any" min="0" class="form-control bp-price" data-i="' + i + '" value="' + (r.price_total != null ? r.price_total : '') + '" style="min-width:90px"></td>' +
			'<td class="text-center align-middle"><input type="checkbox" class="bp-skip" data-i="' + i + '"></td>' +
			'</tr>';
	}).join('');
	$('#bp-review-body').html(rows);
	$('#bp-review').removeClass('d-none');
}

// ---- Phase 4: import ----
function bpCollectReview()
{
	$('.bp-prod').each(function() { var i = $(this).data('i'); var v = $(this).val(); bpData[i].matchId = (v === '__new__') ? null : parseInt(v, 10); });
	$('.bp-qty').each(function() { var i = $(this).data('i'); var v = parseFloat($(this).val()); if (!isNaN(v) && v > 0) { bpData[i].quantity = v; } });
	$('.bp-unit').each(function() { var i = $(this).data('i'); bpData[i].unit = $(this).val(); });
	$('.bp-price').each(function() { var i = $(this).data('i'); var v = parseFloat($(this).val()); bpData[i].price_total = isNaN(v) ? null : v; });
	$('.bp-skip').each(function() { var i = $(this).data('i'); bpData[i].skip = $(this).prop('checked'); });
}
function bpToBase(qty, unit) { if (unit === 'g') { return { amount: qty / 1000, unit: 'kg' }; } if (unit === 'ml') { return { amount: qty / 1000, unit: 'l' }; } return { amount: qty, unit: unit }; }
function bpNowTs() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }
function bpRandom() { var s = '', c = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < 8; i++) { s += c.charAt(Math.floor(Math.random() * c.length)); } return s + '_'; }
function bpCleanName(n) { return (n || 'beleg').replace(/[^a-zA-Z0-9._-]/g, '_'); }

function bpResolveProduct(item)
{
	if (item.matchId) { return Promise.resolve(item.matchId); }
	var body = { name: item.name || 'Neu', description: '', location_id: bpMaster.defaultLocationId || 1 };
	var quId = bpMaster.kgUnitId || bpMaster.defaultQuId;
	if (quId) { body.qu_id_stock = quId; body.qu_id_purchase = quId; }
	return bpApiPost('objects/products', body).then(function(r) { var pid = r.created_object_id; bpMaster.products.push({ id: pid, name: body.name }); return pid; });
}

function bpLearnAlias(item, productId, shopId, cache)
{
	try
	{
		var key = bpNormAlias(item.receipt_text || item.name);
		if (!key || !productId) { return; }
		var sid = shopId ? parseInt(shopId, 10) : null;
		var ts = bpNowTs();
		var existing = cache.find(function(a) { return bpNormAlias(a.alias) === key && String(a.shopping_location_id == null ? '' : a.shopping_location_id) === String(sid == null ? '' : sid); });
		if (existing)
		{
			var changed = String(existing.product_id) !== String(productId);
			var b = changed ? { product_id: productId, times_confirmed: 1, last_used_timestamp: ts } : { times_confirmed: (parseInt(existing.times_confirmed, 10) || 1) + 1, last_used_timestamp: ts };
			existing.product_id = productId; existing.times_confirmed = b.times_confirmed;
			Grocy.Api.Put('objects/product_receipt_aliases/' + existing.id, b, function() { }, function() { });
		}
		else
		{
			var post = { product_id: productId, alias: key, times_confirmed: 1, last_used_timestamp: ts };
			if (sid != null) { post.shopping_location_id = sid; }
			var row = { product_id: productId, alias: key, shopping_location_id: sid, times_confirmed: 1 };
			cache.push(row);
			Grocy.Api.Post('objects/product_receipt_aliases', post, function(r) { row.id = r && r.created_object_id; }, function() { });
		}
	}
	catch (e) { /* learning is non-fatal */ }
}

function bpUploadFileToReceipt(receiptId)
{
	if (!bpFile || !receiptId) { return Promise.resolve(); }
	var fileName = bpRandom() + bpCleanName(bpFile.name);
	var url = U('/api/files/receipts/' + btoa(fileName));
	return fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: bpFile, credentials: 'same-origin' })
		.then(function(r) { if (!r.ok) { throw new Error('upload'); } return bpApiPost('objects/receipt_files', { receipt_id: receiptId, file_name: fileName }); });
}

function bpImport()
{
	bpCollectReview();
	var shopId = $('#bp-shop').val() || null;
	var date = $('#bp-date').val() || new Date().toISOString().slice(0, 10);
	var invoice = ($('#bp-invoice').val() || '').trim();
	var toImport = bpData.filter(function(r) { return !r.skip; });
	if (toImport.length === 0) { $('#bp-import-status').html('<div class="alert alert-warning">' + __t('Nothing to import.') + '</div>'); return; }
	$('#bp-import').prop('disabled', true);
	$('#bp-import-status').html('<div class="text-muted">' + __t('Importing…') + '</div>');

	var receiptId = null, aliasesCache = [];
	var body = { date: date, status: 'paid' };
	if (shopId) { body.shopping_location_id = parseInt(shopId, 10); }
	if (invoice) { body.invoice_number = invoice; }
	bpApiPost('objects/receipts', body).then(function(r) { receiptId = r.created_object_id; })
		.then(function() { return bpUploadFileToReceipt(receiptId).catch(function() { }); })
		.then(function() { return bpApiGet('objects/product_receipt_aliases').then(function(a) { aliasesCache = Array.isArray(a) ? a : []; }).catch(function() { aliasesCache = []; }); })
		.then(function()
		{
			return toImport.reduce(function(chain, item)
			{
				return chain.then(function(results)
				{
					return bpResolveProduct(item).then(function(pid)
					{
						var conv = bpToBase(item.quantity || 1, item.unit || 'Stueck');
						var priceTotal = item.price_total;
						var convPpu = (priceTotal && conv.amount) ? priceTotal / conv.amount : 0;
						var addBody = { amount: conv.amount, price: parseFloat(convPpu.toFixed(4)), best_before_date: '2999-12-31', purchased_date: date };
						if (shopId) { addBody.shopping_location_id = parseInt(shopId, 10); }
						if (receiptId) { addBody.receipt_id = receiptId; }
						return bpApiPost('stock/products/' + pid + '/add', addBody).then(function()
						{
							bpLearnAlias(item, pid, shopId, aliasesCache);
							results.push({ ok: true }); return results;
						});
					}).catch(function(e) { results.push({ ok: false }); return results; });
				});
			}, Promise.resolve([]));
		}).then(function(results)
		{
			var ok = results.filter(function(r) { return r.ok; }).length;
			var fail = results.length - ok;
			$('#bp-review').addClass('d-none');
			$('#bp-done-msg').text(__t('%s products imported', ok) + (fail ? (' · ' + __t('%s failed', fail)) : ''));
			$('#bp-done').removeClass('d-none');
		}).catch(function(e)
		{
			$('#bp-import').prop('disabled', false);
			var msg = (e && e.response) || (e && e.message) || __t('Import failed');
			try { var j = JSON.parse(e.response); if (j.error_message) { msg = j.error_message; } } catch (x) { }
			$('#bp-import-status').html('<div class="alert alert-danger">' + msg + '</div>');
		});
}

$('#bp-import').on('click', bpImport);
$('#bp-restart').on('click', function() { window.location.reload(); });

$('#bp-analyze').on('click', function()
{
	if (!bpFile) { return; }
	$('#bp-analyze').prop('disabled', true);
	$('#bp-review').addClass('d-none');
	$('#bp-done').addClass('d-none');
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
		bpSetProgress(75, __t('Matching products…'));
		return bpMasterReady.then(function() { return bpBuildReview(result); });
	}).then(function()
	{
		bpSetProgress(100, '');
		$('#bp-progress').addClass('d-none');
		$('#bp-status').html('');
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
