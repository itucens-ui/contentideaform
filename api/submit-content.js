// api/submit-content.js - Vercel serverless function
// This handles form submissions and adds them to your Notion database

export default async function handler(req, res) {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, channel, format, notes } = req.body;

    // Validate required fields
    if (!name || !channel || !format) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, channel, format' 
      });
    }

    // Your Notion database ID
    const DATABASE_ID = '1cb71346f26d81d69f66d3e940afcf71';
    
    // Get Notion token from environment variables
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    
    if (!NOTION_TOKEN) {
      return res.status(500).json({ 
        error: 'Notion token not configured' 
      });
    }

    // Prepare data for Notion
    const notionData = {
      parent: {
        database_id: DATABASE_ID
      },
      properties: {
        "Name": {
          title: [
            {
              text: {
                content: name
              }
            }
          ]
        },
        "Format": {
          select: {
            name: format
          }
        },
        "Status": {
          status: {
            name: "Idea"
          }
        }
      }
    };

    // Add notes if provided
    if (notes) {
      notionData.properties["Notes"] = {
        rich_text: [
          {
            text: {
              content: notes
            }
          }
        ]
      };
    }

    // Send to Notion API
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(notionData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Notion API Error:', errorData);
      return res.status(500).json({ 
        error: 'Failed to create Notion page',
        details: errorData
      });
    }

    const result = await response.json();
    
    return res.status(200).json({ 
      success: true, 
      pageId: result.id,
      url: result.url,
      message: 'Content idea added successfully!'
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
