// Quick fix for themed menu generation
const generateThemedMenu = (items, theme) => {
  const themes = {
    professional: { primaryColor: '#2563eb', name: 'Professional Cannabis Solutions' },
    modern: { primaryColor: '#7c3aed', name: 'Modern Cannabis Collective' },
    cannabis: { primaryColor: '#D4AF37', name: 'Gold Standard Cannabis' },
    wholesale: { primaryColor: '#059669', name: 'Wholesale Cannabis Distribution' },
    luxury: { primaryColor: '#dc2626', name: 'Luxury Cannabis Collection' }
  };

  const currentTheme = themes[theme] || themes.cannabis;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${currentTheme.name}</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .product-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
    .product-name { font-size: 1.2em; font-weight: bold; color: ${currentTheme.primaryColor}; }
    .btn { display: inline-block; padding: 10px 15px; margin: 5px; text-decoration: none; border-radius: 5px; }
    .btn-primary { background: ${currentTheme.primaryColor}; color: white; }
    .btn-secondary { background: #6b7280; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${currentTheme.name}</h1>
    <p>Premium Cannabis Products - Live Inventory</p>
  </div>
  <div class="grid">
    ${items.map(item => `
      <div class="product-card">
        <div class="product-name">${item.name || 'Cannabis Product'}</div>
        <p>Qty: ${item.quantity || 0} | Price: $${parseFloat(item.base_price || '0').toFixed(2)}</p>
        <div>
          <a href="https://gold-standard-cbd.com/products/${(item.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}" class="btn btn-primary">Order Now</a>
          <a href="https://gold-standard-cbd.com/pages/certificates-of-analysis" class="btn btn-secondary">COA</a>
        </div>
      </div>
    `).join('')}
  </div>
  <div style="text-align: center; margin-top: 30px;">
    <p>Contact: 541-295-8811 | kaya@goldcbd.com | goldcbd.com</p>
  </div>
</body>
</html>`;
};

module.exports = { generateThemedMenu };