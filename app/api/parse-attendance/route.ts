import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are parsing a college attendance report PDF.
    
Extract all subjects and their attendance data. 
For subjects that have both THEO (Theory) and PRAC (Practical) versions, MERGE them by adding their conducted and attended numbers together.

Return ONLY a valid JSON array like this, nothing else:
[
  {
    "subject_name": "Deep Learning",
    "conducted": 49,
    "attended": 40
  },
  {
    "subject_name": "Disaster Management", 
    "conducted": 34,
    "attended": 28
  }
]

Rules:
- Merge Theory + Practical of same subject
- Use clean subject names (no THEO/PRAC suffix)
- Only return the JSON array, no other text`

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64,
        },
      },
      prompt,
    ])

    const text = result.response.text()
    
    // Clean response and parse JSON
    const cleaned = text.replace(/```json|```/g, '').trim()
    const subjects = JSON.parse(cleaned)

    return NextResponse.json({ subjects })
  } catch (error: any) {
    console.error('Error parsing PDF:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}