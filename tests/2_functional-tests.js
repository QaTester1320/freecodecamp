const chai = require('chai');
const assert = chai.assert;

const server = require('../server');

const chaiHttp = require('chai-http');
chai.use(chaiHttp);

// Prefer IPv4 results (when Node supports it) to avoid binding issues on some Windows setups
try {
  const dns = require('dns');
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
    console.log('DNS result order set to ipv4first');
  }
} catch (e) {
  // ignore if not available
  console.log('dns.setDefaultResultOrder not available, continuing...');
}

suite('Functional Tests', function () {
  this.timeout(5000);

  suite('Integration tests with chai-http', function () {
    // #1
    test('Test GET /hello with no name', function (done) {
      chai
        .request(server)
        .keepOpen()
        .get('/hello')
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'hello Guest');
          done();
        });
    });

    // #2
    test('Test GET /hello with your name', function (done) {
      chai
        .request(server)
        .keepOpen()
        .get('/hello?name=xy_z')
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'hello xy_z');
          done();
        });
    });

    // #3
    test('Send {surname: "Colombo"}', function (done) {
      chai
        .request(server)
        .keepOpen()
        .put('/travellers')
        .send({ surname: 'Colombo' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body);
          assert.property(res.body, 'name');
          assert.property(res.body, 'surname');
          assert.property(res.body, 'dates');
          assert.equal(res.body.name, 'Cristoforo');
          assert.equal(res.body.surname, 'Colombo');
          done();
        });
    });

    // #4
    test('Send {surname: "da Verrazzano"}', function (done) {
      chai
        .request(server)
        .keepOpen()
        .put('/travellers')
        .send({ surname: 'da Verrazzano' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body);
          assert.equal(res.body.name, 'Giovanni');
          assert.equal(res.body.surname, 'da Verrazzano');
          done();
        });
    });
  });
});

// -------------------- Zombie.js Tests (async, robust) --------------------

const Browser = require('zombie');

// Map a hostname to the local app port (use IPv4 loopback effectively)
Browser.localhost('example.com', 3000);

suite('Functional Tests with Zombie.js', function () {
  this.timeout(5000);

  const browser = new Browser();

  // Visit the root page before running the browser tests
  suiteSetup(async function () {
    await browser.visit('/');
  });

  suite('Headless browser', function () {
    test('should have a working "site" property', function () {
      assert.isNotNull(browser.site);
    });
  });

  suite('"Famous Italian Explorers" form', function () {
    // Helper to try pressing a list of selectors that might match the submit control
    async function tryPressButton(selectors) {
      for (const sel of selectors) {
        try {
          // pressButton resolves when the navigation / form action completes
          await browser.pressButton(sel);
          return true;
        } catch (err) {
          // try next selector
        }
      }
      return false;
    }

    // #5
    test('Submit the surname "Colombo" in the HTML form', async function () {
      // fill field (works with name or selector)
      await browser.fill('surname', 'Colombo');

      // Try common submit selectors in order
      const pressed = await tryPressButton([
        'input[type="submit"]',
        'button[type="submit"]',
        'input[type="button"][value="submit"]',
        'button[name="submit"]',
        'submit' // fallback: by button text (if present)
      ]);

      if (!pressed) {
        // final fallback: submit the form directly and wait for navigation
        const form = browser.querySelector('form');
        if (!form) throw new Error('Form not found in page for submission');
        form.submit();
        // wait a short while for DOM to update
        await browser.wait(); // zombie's wait ensures async tasks settle
      }

      // Assertions after submission
      browser.assert.success();
      browser.assert.text('span#name', 'Cristoforo');
      browser.assert.text('span#surname', 'Colombo');
      browser.assert.text('span#dates', '1451 - 1506');
    });

    // #6
    test('Submit the surname "Vespucci" in the HTML form', async function () {
      await browser.fill('surname', 'Vespucci');

      const pressed = await tryPressButton([
        'input[type="submit"]',
        'button[type="submit"]',
        'input[type="button"][value="submit"]',
        'button[name="submit"]',
        'submit'
      ]);

      if (!pressed) {
        const form = browser.querySelector('form');
        if (!form) throw new Error('Form not found in page for submission');
        form.submit();
        await browser.wait();
      }

      browser.assert.success();
      browser.assert.text('span#name', 'Amerigo');
      browser.assert.text('span#surname', 'Vespucci');
      browser.assert.text('span#dates', '1454 - 1512');
    });
  });
});
