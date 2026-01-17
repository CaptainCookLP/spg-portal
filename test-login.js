const testLogin = async () => {
  let sessionToken = null;
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'fabian.koch1998@gmail.com',
        password: 'Start1234!'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Extract cookie from set-cookie header
    const setCookieHeader = response.headers.get('set-cookie');
    console.log('Set-Cookie Header:', setCookieHeader);
    
    if (setCookieHeader) {
      const match = setCookieHeader.match(/spg_session=([^;]+)/);
      if (match) {
        sessionToken = match[1];
        console.log('Extracted token:', sessionToken);
      }
    }
    
    // Try to access protected page with manual cookie
    if (response.ok && sessionToken) {
      console.log('\n--- Testing protected page access ---');
      const pageResp = await fetch('http://localhost:3000/profil', {
        headers: {
          'Cookie': `spg_session=${sessionToken}`
        }
      });
      console.log('Profil page status:', pageResp.status);
      console.log('Profil page OK:', pageResp.ok);
      if (pageResp.ok) {
        const html = await pageResp.text();
        console.log('Page length:', html.length);
        console.log('Page contains "Profil":', html.includes('Profil') || html.includes('profil'));
      }
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
};

testLogin();
