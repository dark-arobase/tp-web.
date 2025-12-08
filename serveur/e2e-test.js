const http = require('http');

const BASE = 'http://localhost:3000';

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const ct = res.headers['content-type'] || '';
        if (ct.includes('application/json')) {
          try { resolve(JSON.parse(body)); }
          catch (e) { resolve(body); }
        } else {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    console.log('GET /allClients')
    let clients = await request('GET', '/allClients');
    console.log('clients count =', Array.isArray(clients) ? clients.length : 'N/A');

    let client;
    if (Array.isArray(clients) && clients.length > 0) {
      client = clients[0];
      console.log('Using existing client', client.id || client);
    } else {
      console.log('Creating test client...');
      client = await request('POST', '/addClient', { nom: 'Test', prenom: 'Client', telephone: '5140000000', email: 'test@example.com', adresse: 'Rue Test' });
      console.log('Created client', client.id || client);
    }

    console.log('\nPOST /addLoan');
    const loan = await request('POST', '/addLoan', { client_id: client.id, montant: 100.00, taux: 1, duree: 1, date: new Date().toISOString().slice(0,10) });
    console.log('Loan created:', loan);

    console.log('\nGET /allLoans');
    const all = await request('GET', '/allLoans');
    console.log('allLoans count=', Array.isArray(all) ? all.length : all);

    console.log('\nDone');
  } catch (err) {
    console.error('E2E script error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();