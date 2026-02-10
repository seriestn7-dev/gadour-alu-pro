/*************************
 * HELPERS
 *************************/
function $(id){ return document.getElementById(id); }

/*************************
 * GLOBALS (INCHANGÉ)
 *************************/
let devis = [];
const toulBarra = 650;
const CUT_MARGIN = 5;

/*************************
 * UI
 *************************/
window.toggleFixOption = function(){
  const p = $('productType').value;
  if(p.includes('ouvrant') || p.includes('beb')){
    $('fixOptionContainer').style.display = 'flex';
  }else{
    $('fixOptionContainer').style.display = 'none';
    $('hasFix').checked = false;
    $('fixInputWrapper').style.display = 'none';
  }
}

window.toggleFixInput = function(){
  $('fixInputWrapper').style.display = $('hasFix').checked ? 'flex' : 'none';
}

/*************************
 * ADD ITEM (FIXÉ)
 *************************/
window.addItemToDevis = function(){
  const productSelect = $('productType');
  const colorSelect   = $('couleur');

  const L = parseFloat($('largeur').value);
  const H = parseFloat($('hauteur').value);
  const Q = parseInt($('quantite').value);

  if(isNaN(L) || isNaN(H) || isNaN(Q) || L<=0 || H<=0 || Q<=0){
    alert('قِيَم غير صحيحة');
    return;
  }

  const hasFix = $('hasFix').checked;
  let fixSize = 0;
  let fixPos  = 'bottom';

  if(hasFix){
    fixSize = parseFloat($('fixSize').value);
    fixPos  = $('fixPosition').value;

    if(
      (fixPos === 'top' || fixPos === 'bottom') && fixSize >= H ||
      (fixPos === 'left' || fixPos === 'right') && fixSize >= L
    ){
      alert('Erreur Fixe');
      return;
    }
  }

  devis.push({
    product: productSelect.value,
    productName: productSelect.options[productSelect.selectedIndex].text,

    L_cm: L,
    H_cm: H,
    Q: Q,

    colorFactor: parseFloat(colorSelect.value),
    colorName: colorSelect.options[colorSelect.selectedIndex].text,

    hasFix: hasFix,
    fixSize: fixSize,
    fixPos: fixPos
  });

  updateUI();
}

/*************************
 * UPDATE TABLE
 *************************/
function updateUI(){
  const tbody = document.querySelector('#devis-items tbody');
  tbody.innerHTML = '';

  devis.forEach((it, i)=>{
    const fixTxt = it.hasFix ? `Fix ${it.fixPos} (${it.fixSize})` : '-';

    tbody.innerHTML += `
      <tr>
        <td>${it.Q}</td>
        <td>${it.productName}</td>
        <td>${it.colorName}</td>
        <td>${it.L_cm} x ${it.H_cm}</td>
        <td>${fixTxt}</td>
        <td>
          <button style="color:red" onclick="devis.splice(${i},1);updateUI()">X</button>
        </td>
      </tr>
    `;
  });
}

window.clearDevis = function(){
  if(confirm('Vider ?')){
    devis = [];
    updateUI();
    $('total-result').innerHTML = '';
  }
}

/********************************************************
 * ⛔⛔⛔
 * من هنا لتحت ❌ ما تمسّش ❌
 * خلي حساباتك الأصلية كيما راهي
 ********************************************************/

// generateCutData()
// calculateTotalDevis()
// calculateDebit()
// drawWindowSVG()
// renderFacture()
