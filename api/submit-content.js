// api/submit-content.js - Clean working version
export default async function handler(req, res) {
  // Enable CORS
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
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Request body:', req.body);
    
    const { name, channel, format, notes, goal } = req.body;

    // Validate required fields
    if (!name || !channel || !format) {
      console.log('Missing required fields:', { name, channel, format });
      return res.status(400).json({ 
        error: 'Missing required fields: name, channel, format' 
      });
    }

    // Your Notion database ID
    const DATABASE_ID = '1cb71346f26d81d69f66d3e940afcf71';
    
    // Get Notion token from environment variables
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    
    console.log('NOTION_TOKEN exists:', !!NOTION_TOKEN);
    
    if (!NOTION_TOKEN) {
      console.error('NOTION_TOKEN not found in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error - missing Notion token'
      });
    }

    // Prepare data for Notion with all required fields
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
        "Channel": {
          select: {
            name: channel
          }
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

    // Add goal if provided
    if (goal && goal.trim()) {
      notionData.properties["Goal"] = {
        select: {
          name: goal.trim()
        }
      };
    }

    // Add notes if provided
    if (notes && notes.trim()) {
      notionData.properties["Notes"] = {
        rich_text: [
          {
            text: {
              content: notes.trim()
            }
          }
        ]
      };
    }

    console.log('Sending to Notion:', JSON.stringify(notionData, null, 2));

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

    const responseText = await response.text();
    console.log('Notion API Response Status:', response.status);
    console.log('Notion API Response:', responseText);

    if (!response.ok) {
      console.error('Notion API Error:', response.status, responseText);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = { message: responseText };
      }
      
      return res.status(response.status).json({ 
        error: 'Failed to create Notion page',
        details: errorDetails,
        status: response.status
      });
    }

    const result = JSON.parse(responseText);
    console.log('Success! Created page:', result.id);
    
    return res.status(200).json({ 
      success: true, 
      pageId: result.id,
      url: result.url,
      message: 'Content idea added successfully!'
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
