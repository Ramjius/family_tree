import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { image } = await request.json()
    
    // Remove data:image/...;base64, prefix
    const base64Image = image.split(',')[1]
    
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'FACE_DETECTION',
                  maxResults: 10,
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()
    
    if (data.responses && data.responses[0]) {
      const faces = data.responses[0].faceAnnotations || []
      const faceCount = faces.length
      
      return NextResponse.json({
        success: true,
        faceCount,
        isSinglePerson: faceCount === 1,
        message: faceCount === 1 
          ? 'Single person detected' 
          : faceCount === 0 
          ? 'No face detected in image'
          : `Multiple people detected (${faceCount} faces)`
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Unable to analyze image'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Face detection error:', error)
    return NextResponse.json({
      success: false,
      message: 'Error analyzing image: ' + error.message
    }, { status: 500 })
  }
}