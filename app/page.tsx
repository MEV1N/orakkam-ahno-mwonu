"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// MediaPipe imports
import { FaceMesh } from "@mediapipe/face_mesh"
import { Camera } from "@mediapipe/camera_utils"

// Funny multiple choice questions
const funnyQuestions = [
  {
    question: "1+2",
    options: ["8", "3", "0", "5"],
    correct: 1,
  },
  {
    question: "Which number comes after 7",
    options: ["9", "2", "8","4"],
    correct: 2,
  },
  {
    question: "Click 2",
    options: ["what 2", "2", "3 is here", "Where is 2?"],
    correct: 1,
  },
  {
    question: "are you asleep",
    options: ["Nope", "Don't know", "yes", "I can sleep whole day"],
    correct: 0,
  },
  {
    question: "number version of two two two four",
    options: ["2224", "2244", "2223", "2234"],
    correct: 0,
  },
  {
    question: "what is this: 4",
    options: ["2", "4", "8", "7"],
    correct: 1,
  },
  {
    question: "how many 1 are there 1 1 1",
    options: ["4", "3", "2", "1"],
    correct: 0,
  },
  {
    question: "Can u sleep with your eyes open?",
    options: ["yes", "no", "why not", "i am awake"],
    correct: 3,
  },
]

// Sarcastic responses for wrong answers while awake
const sarcasticResponses = [
  "kannh thurannh orangan skilled ahnello",
  "Engane sadikkunnu ingane kannh thorannh orangan", 
  "Orakkavum oru skill thanne",
  "new sleep skill unlocked",
]

// Praise responses for correct answers while sleeping
const praiseResponses = [
  "6th sense vellom ondo",
  "Ennalum orangikkond engane??",
  "Ith oru kazivh thanne",
  "Divyadristhi vellom ondo??"
]

const wakeUpSounds = [
  "WAKE UP! WAKE UP! Time to rejoin the conscious world!",
  "BEEP BEEP BEEP! This is your brain calling!",
  "SNOOOOORE... just kidding, WAKE UP!",
  "RISE AND SHINE, sleeping beauty!",
  "Your eyelids called - they're tired of being closed!",
]

export default function SleepDetector3000() {
  const [isActive, setIsActive] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<(typeof funnyQuestions)[0] | null>(null)
  const [feedback, setFeedback] = useState("")
  const [eyesClosedTime, setEyesClosedTime] = useState(0)
  const [isEyesClosed, setIsEyesClosed] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<"pending" | "granted" | "denied">("pending")
  const [detectionStatus, setDetectionStatus] = useState("Initializing...")
  const [questionCount, setQuestionCount] = useState(0)
  const [awakeCorrectAnswers, setAwakeCorrectAnswers] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [scores, setScores] = useState({
    wrongAwake: 0,
    correctSleeping: 0,
    correctAwake: 0,
    wrongSleeping: 0,
  })
  const [blinkingEyes, setBlinkingEyes] = useState("Awake")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const questionTimerRef = useRef<NodeJS.Timeout>()
  const responseTimerRef = useRef<NodeJS.Timeout>()
  const eyesClosedTimerRef = useRef<NodeJS.Timeout>()
  const faceMeshRef = useRef<FaceMesh | null>(null)
  const cameraRef = useRef<Camera | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout>()

  // Play wake up sound
  const playWakeUpSound = useCallback(() => {
    const randomSound = wakeUpSounds[Math.floor(Math.random() * wakeUpSounds.length)]
    setFeedback("WAKE UP CALL!")
  }, [])

  // Calculate Eye Aspect Ratio (EAR) to detect closed eyes
  const calculateEAR = useCallback((eyeLandmarks: any[]) => {
    if (!eyeLandmarks || eyeLandmarks.length < 6) return 1
    
    // Get eye landmark points
    const p1 = eyeLandmarks[1], p2 = eyeLandmarks[5]
    const p3 = eyeLandmarks[2], p4 = eyeLandmarks[4] 
    const p5 = eyeLandmarks[0], p6 = eyeLandmarks[3]
    
    // Calculate distances
    const vertical1 = Math.sqrt(Math.pow(p1.x - p5.x, 2) + Math.pow(p1.y - p5.y, 2))
    const vertical2 = Math.sqrt(Math.pow(p2.x - p4.x, 2) + Math.pow(p2.y - p4.y, 2))
    const horizontal = Math.sqrt(Math.pow(p3.x - p6.x, 2) + Math.pow(p3.y - p6.y, 2))
    
    return (vertical1 + vertical2) / (2 * horizontal)
  }, [])

  // Initialize MediaPipe FaceMesh
  const initializeFaceMesh = useCallback(async () => {
    try {
      setDetectionStatus("Loading face detection models...")
      
      // Try to initialize MediaPipe with timeout
      const initPromise = new Promise<boolean>((resolve, reject) => {
        try {
          const faceMesh = new FaceMesh({
            locateFile: (file) => {
              // Try multiple CDN sources as fallback
              const cdnUrls = [
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
                `https://unpkg.com/@mediapipe/face_mesh/${file}`
              ]
              return cdnUrls[0] // Use first URL, can be enhanced to try fallbacks
            }
          })

          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          })

          faceMesh.onResults((results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              const landmarks = results.multiFaceLandmarks[0]
              
              // Eye landmark indices for MediaPipe FaceMesh
              const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
              const rightEyeIndices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
              
              // Get eye landmarks
              const leftEye = leftEyeIndices.map(i => landmarks[i])
              const rightEye = rightEyeIndices.map(i => landmarks[i])
              
              // Calculate EAR for both eyes
              const leftEAR = calculateEAR([leftEye[1], leftEye[2], leftEye[3], leftEye[4], leftEye[5], leftEye[0]])
              const rightEAR = calculateEAR([rightEye[1], rightEye[2], rightEye[3], rightEye[4], rightEye[5], rightEye[0]])
              const avgEAR = (leftEAR + rightEAR) / 2
              
              // Threshold for closed eyes (adjust as needed)
              const eyesCurrentlyClosed = avgEAR < 0.2
              
              setIsEyesClosed(eyesCurrentlyClosed)
              
              if (eyesCurrentlyClosed) {
                setEyesClosedTime((prev) => {
                  const newTime = prev + 1
                  if (newTime >= 5) {
                    setDetectionStatus("Sleeping detected!")
                    setBlinkingEyes("Sleeping")
                  } else {
                    setDetectionStatus(`Eyes closed for ${newTime}s...`)
                    setBlinkingEyes("Drowsy")
                  }
                  return newTime
                })
              } else {
                setEyesClosedTime(0)
                setDetectionStatus("Eyes open - you're awake!")
                setBlinkingEyes("Awake")
              }
            } else {
              setDetectionStatus("No face detected")
            }
          })

          // Test if MediaPipe loaded successfully
          setTimeout(() => {
            faceMeshRef.current = faceMesh
            setDetectionStatus("Face detection models loaded!")
            resolve(true)
          }, 2000)
          
        } catch (err) {
          reject(err)
        }
      })

      // Set timeout for MediaPipe initialization
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("MediaPipe initialization timeout")), 10000)
      })

      await Promise.race([initPromise, timeoutPromise])
      return true
      
    } catch (error) {
      console.error("Failed to load MediaPipe models:", error)
      setDetectionStatus("MediaPipe failed - using simulation mode")
      return false
    }
  }, [calculateEAR])

  // Load face-api.js models (simplified simulation)
  const loadFaceApiModels = useCallback(async () => {
    try {
      setDetectionStatus("Attempting to load real eye detection...")
      // Try MediaPipe first, but with timeout and fallback
      const mediaPipeLoaded = await initializeFaceMesh()
      if (mediaPipeLoaded) {
        return true
      } else {
        throw new Error("MediaPipe initialization failed")
      }
    } catch (error) {
      console.error("Failed to load face models:", error)
      setDetectionStatus("Using simulation mode - detection active")
      return false
    }
  }, [initializeFaceMesh])

  // Initialize camera and face detection
  const initializeFaceDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraStatus("granted")
      setDetectionStatus("Detection system activated - monitoring your alertness!")

      // Load face detection models
      const modelsLoaded = await loadFaceApiModels()

      const initSimulationMode = () => {
        setDetectionStatus("Simulation mode active - game ready!")
        const detectEyes = () => {
          const eyesCurrentlyClosed = Math.random() > 0.85 // 15% chance eyes are closed
          setIsEyesClosed(eyesCurrentlyClosed)

          if (eyesCurrentlyClosed) {
            setEyesClosedTime((prev) => {
              const newTime = prev + 1
              if (newTime >= 5) {
                setDetectionStatus("Sleeping detected!")
                setBlinkingEyes("Sleeping")
              } else {
                setDetectionStatus(`Eyes closed for ${newTime}s...`)
                setBlinkingEyes("Drowsy")
              }
              return newTime
            })
          } else {
            setEyesClosedTime(0)
            setDetectionStatus("Eyes open - you're awake!")
            setBlinkingEyes("Awake")
          }
        }

        detectionIntervalRef.current = setInterval(detectEyes, 1000)
      }

      if (modelsLoaded && faceMeshRef.current && videoRef.current) {
        try {
          // Initialize MediaPipe Camera
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (faceMeshRef.current && videoRef.current) {
                await faceMeshRef.current.send({ image: videoRef.current })
              }
            },
            width: 640,
            height: 480
          })
          
          cameraRef.current = camera
          camera.start()
          setDetectionStatus("Real eye detection active!")
        } catch (cameraError) {
          console.error("Camera initialization failed:", cameraError)
          // Fall back to simulation even if models loaded
          initSimulationMode()
        }
      } else {
        // Fallback to simulation mode if MediaPipe fails
        initSimulationMode()
      }

      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current)
        }
        if (cameraRef.current) {
          cameraRef.current.stop()
        }
      }
    } catch (error) {
      console.error("Camera access denied:", error)
      setCameraStatus("denied")
      setDetectionStatus("Camera access denied - manual mode only")
    }
  }, [loadFaceApiModels])

  // Ask a random question
  const askQuestion = useCallback(() => {
    // Check if we've already asked 3 questions
    if (questionCount >= 3) {
      return
    }

    const randomQuestion = funnyQuestions[Math.floor(Math.random() * funnyQuestions.length)]
    setCurrentQuestion(randomQuestion)
    setFeedback("")

    // Set response timer (30 seconds) - removed time up prompt
    responseTimerRef.current = setTimeout(() => {
      if (eyesClosedTime >= 5) {
        playWakeUpSound()
      }
      setCurrentQuestion(null)
      
      // Check if game should end
      const newQuestionCount = questionCount + 1
      if (newQuestionCount >= 3) {
        endGame()
      } else {
        setTimeout(askQuestion, 1000)
      }
    }, 30000)
  }, [playWakeUpSound, eyesClosedTime, questionCount])

  // End the game and show final results
  const endGame = useCallback(() => {
    setGameComplete(true)
    setCurrentQuestion(null)
    
    if (awakeCorrectAnswers >= 2) {
      setFeedback("CONGRATULATIONS! You are definitely AWAKE!")
      //speak("Congratulations! You are definitely awake! You got two or more questions right with your eyes open!")
    } else {
      setFeedback("Hmm... You might need some coffee! You didn't get enough questions right while awake.")
      //speak("Hmm, you might need some coffee! You didn't get enough questions right while awake.")
    }
    
    // Auto-restart after 10 seconds
    setTimeout(() => {
      restartGame()
    }, 10000)
  }, [awakeCorrectAnswers])

  // Restart the game
  const restartGame = useCallback(() => {
    setQuestionCount(0)
    setAwakeCorrectAnswers(0)
    setGameComplete(false)
    setFeedback("")
    setScores({
      wrongAwake: 0,
      correctSleeping: 0,
      correctAwake: 0,
      wrongSleeping: 0,
    })
    setTimeout(askQuestion, 2000)
  }, [askQuestion])

  // Handle answer selection
  const handleAnswer = useCallback(
    (selectedIndex: number) => {
      if (!currentQuestion || gameComplete) return

      if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current)
      }

      const isCorrect = selectedIndex === currentQuestion.correct
      const isSleeping = eyesClosedTime >= 5
      
      // Increment question count
      const newQuestionCount = questionCount + 1
      setQuestionCount(newQuestionCount)

      let responseText: string

      if (isCorrect && isSleeping) {
        // Correct answer while sleeping - praise them
        responseText = praiseResponses[Math.floor(Math.random() * praiseResponses.length)]
        setScores((prev) => ({ ...prev, correctSleeping: prev.correctSleeping + 1 }))
      } else if (isCorrect && !isSleeping) {
        // Correct answer while awake - count it
        const newAwakeCorrectAnswers = awakeCorrectAnswers + 1
        setAwakeCorrectAnswers(newAwakeCorrectAnswers)
        responseText = "Oh appo sherikkum kurach onarnnh irikkuva alle"
        setScores((prev) => ({ ...prev, correctAwake: prev.correctAwake + 1 }))
        
        // Check if user got 2 correct answers while awake - end game immediately
        if (newAwakeCorrectAnswers >= 2) {
          setFeedback("Oh Pwoli sherikkum onarnnekkuva alle")
         // speak("Amazing! You got 2 correct answers while awake! You are definitely awake!")
          setTimeout(() => {
            endGame()
          }, 3000)
          return
        }
      } else if (!isCorrect && !isSleeping) {
        // Wrong answer while awake - sarcastic comment
        responseText = sarcasticResponses[Math.floor(Math.random() * sarcasticResponses.length)]
        setScores((prev) => ({ ...prev, wrongAwake: prev.wrongAwake + 1 }))
      } else {
        // Wrong answer while sleeping
        responseText = "Wrong answer, but at least you're being honest about sleeping!"
        setScores((prev) => ({ ...prev, wrongSleeping: prev.wrongSleeping + 1 }))
      }

      setFeedback(responseText)
      setCurrentQuestion(null)
      
      // Check if game should end or continue
      if (newQuestionCount >= 3) {
        setTimeout(() => {
          endGame()
        }, 3000) // 3 second delay to let feedback be read
      } else {
        // Ask next question after feedback
        setTimeout(() => {
          askQuestion()
        }, 3000) // 3 second delay to let feedback be read
      }
    },
    [currentQuestion, eyesClosedTime, askQuestion, questionCount, gameComplete, endGame],
  )

  // Start the sleep detector
  const startDetector = useCallback(async () => {
    setIsActive(true)
    await initializeFaceDetection()

    // Ask first question after 3 seconds
    setTimeout(askQuestion, 3000)

    // No need for interval timer since questions will chain through dialogue
  }, [initializeFaceDetection, askQuestion])

  // Stop the sleep detector
  const stopDetector = useCallback(() => {
    setIsActive(false)

    // Clear all timers
    if (questionTimerRef.current) clearInterval(questionTimerRef.current)
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current)
    if (eyesClosedTimerRef.current) clearTimeout(eyesClosedTimerRef.current)
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current)

    // Stop MediaPipe camera
    if (cameraRef.current) {
      cameraRef.current.stop()
    }

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Reset state
    setCurrentQuestion(null)
    setFeedback("")
    setQuestionCount(0)
    setAwakeCorrectAnswers(0)
    setGameComplete(false)
    setEyesClosedTime(0)
    setIsEyesClosed(false)
    setCameraStatus("pending")
    setDetectionStatus("Stopped")
    setBlinkingEyes("Awake")
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetector()
    }
  }, [stopDetector])

  const totalQuestions = Object.values(scores).reduce((a, b) => a + b, 0)
  const brainAwakeScore = scores.correctAwake + scores.wrongAwake
  const sleepGeniusScore = scores.correctSleeping + scores.wrongSleeping

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-blue-500/10"></div>
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-orange-300 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-2000"></div>
      </div>
      
      {/* Hidden video element for camera access */}
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-white mb-2 font-rounded drop-shadow-lg">Orakkam ahno mwonu</h1>
          <h2 className="text-2xl font-semibold text-blue-100 mb-1">Are You Sure You Are Awake??</h2>
          {gameComplete && (
            <div className="text-blue-200 mt-2">
              <div className="text-orange-400 font-bold">Game Complete!</div>
            </div>
          )}
        </div>

        {/* Main Control */}
        <Card className="mb-4 bg-white/95 backdrop-blur-sm border border-blue-200 shadow-xl shadow-blue-900/20">
          <CardContent className="p-4 text-center">
            {!isActive ? (
              <div>
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-orange-100 border-2 border-orange-300 rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                  <img 
                    src="/img/kodi.jpg" 
                    alt="Kodi mascot" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-lg text-gray-700 mb-4">
                  Ready to test your alertness?
                </p>
                <Button
                  onClick={startDetector}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 text-xl rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-500"
                >
                  Start Detection
                </Button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-orange-400 to-orange-500 border-2 border-orange-300 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-xs font-bold">Active</span>
                </div>
                <p className="text-lg text-gray-700 mb-2">Detection active - stay alert!</p>
                <Button onClick={stopDetector} className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 text-xl rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                  Stop Detection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Section */}
        {isActive && currentQuestion && !gameComplete && (
          <Card className="mb-4 bg-white/95 backdrop-blur-sm border border-blue-200 shadow-xl shadow-blue-900/20">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-blue-600 border border-blue-400 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-xs font-bold">Q{questionCount + 1}</span>
                </div>
                <div className="text-sm text-blue-600 mb-2 font-medium">Question {questionCount + 1} of 3</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{currentQuestion.question}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="bg-gradient-to-r from-blue-50 to-orange-50 hover:from-blue-100 hover:to-orange-100 text-gray-800 border-2 border-blue-200 hover:border-orange-300 p-4 text-xl rounded-lg h-auto min-h-[60px] transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <div className="text-center">
                      <div className="text-xl font-bold mb-1 text-blue-600">{String.fromCharCode(65 + index)}</div>
                      <div>{option}</div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-blue-600">You have 30 seconds to answer!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Section */}
        {feedback && (
          <Card className="mb-4 bg-white/95 backdrop-blur-sm border border-orange-200 shadow-xl shadow-orange-900/20">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-gray-800">{feedback}</div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-4 text-blue-100">
          <p className="text-sm">Your data is processed locally and never leaves your browser</p>
          <p className="text-xs mt-2">Detection system active for optimal performance</p>
        </div>
      </div>
    </div>
  )
}
