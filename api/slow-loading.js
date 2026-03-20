export const config = {
  maxDuration: 60, // set max duration to 60s
};

export default async function handler(req, res) {
  // Delay for 60 seconds
  await new Promise(resolve => setTimeout(resolve, 60000));

  // Fetch the homepage HTML
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'angaadi.online';
  
  try {
    const response = await fetch(`${protocol}://${host}/`);
    const html = await response.text();
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading page');
  }
}
