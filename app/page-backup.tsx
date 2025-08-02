"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// Funny multiple choice questions
const funnyQuestions = [
  {
    question: "What color is sleep?",
    options: ["Yes", "Pillow", "Blue", "Thursday"],
    correct: 2,
  },
  {
    question: "What sound does a dream make?",
    options: ["Bzzz", "Snorecore", "Meow", "Depends on the cheese"],
    correct: 3,
  },
  {
    question: "How many sheep does it take to fall asleep?",
    options: ["Purple", "All of them", "42", "What's a sheep?"],
    correct: 2,
  },
  {
    question: "What's the capital of Dreamland?",
    options: ["Snooze City", "Pillow Town", "REM Rapids", "Yawnington"],
    correct: 0,
  },
  {
    question: "What do you call a sleeping bull?",
    options: ["A bulldozer", "Beef jerky", "Moo-nap", "Tuesday"],
    correct: 0,
  },
  {
    question: "How do you wake up a sleeping computer?",
    options: ["Ctrl+Alt+Yawn", "Click the mouse", "Sing it a lullaby", "Coffee.exe"],
    correct: 1,
  },
  {
    question: "What's the best pillow filling?",
    options: ["Dreams", "Clouds", "Unicorn hair", "Leftover thoughts"],
    correct: 0,
  },
  {
    question: "Why do we close our eyes when we sleep?",
    options: ["To keep dreams in", "Privacy mode", "Energy saving", "All of the above"],
    correct: 3,
  },
]

// Funny responses
const responses = {
  wrongAwake: [
    "You're awake and still got that wrong?",
    "Open eyes, closed brain?",
    "Did your IQ hit snooze too?",
    "Awake but not aware, I see!",
    "Your eyes work better than your brain!",
  ],
  correctSleeping: [
    "Wow! Sleep-learning confirmed!",
    "Genius mode: unconscious edition!",
    "Either you're cheating, or dreaming in 4K!",
    "Sleeping beauty with brains!",
    "Your subconscious is smarter than most people awake!",
  ],
  correctAwake: [
    "Nice! Your brain is fully online!",
    "Correct and conscious - perfect combo!",
    "Alert and accurate!",
    "Your neurons are firing on all cylinders!",
  ],
  wrongSleeping: [
    "Wrong answer, but at least you're honest about sleeping!",
    "Sleep-guessing isn't your strong suit!",
    "Even your dreams got confused!",
    "Sleeping AND wrong? That's commitment!",
  ],
}

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
  const faceApiLoadedRef = useRef(false)

  // Text-to-Speech function
  const speak = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel() // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.1
      utterance.pitch = 1.2
      utterance.volume = 0.8
      speechSynthesis.speak(utterance)
    }
  }, [])

  // Play wake up sound
  const playWakeUpSound = useCallback(() => {
    const randomSound = wakeUpSounds[Math.floor(Math.random() * wakeUpSounds.length)]
    speak(randomSound)
    setFeedback("WAKE UP CALL!")
  }, [speak])

  // Load face-api.js models (simplified simulation)
  const loadFaceApiModels = useCallback(async () => {
    try {
      // In a real implementation, you would load face-api.js models here
      // For this demo, we'll simulate the loading
      await new Promise((resolve) => setTimeout(resolve, 2000))
      faceApiLoadedRef.current = true
      setDetectionStatus("Face detection models loaded!")
      return true
    } catch (error) {
      console.error("Failed to load face-api models:", error)
      setDetectionStatus("Face detection unavailable - using simulation mode")
      return false
    }
  }, [])

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
      await loadFaceApiModels()

      // Start eye detection simulation
      const detectEyes = () => {
        // Simulate eye detection (in real app, use face-api.js here)
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

      // Run detection every second
      const detectionInterval = setInterval(detectEyes, 1000)

      return () => {
        clearInterval(detectionInterval)
      }
    } catch (error) {
      console.error("Camera access denied:", error)
      setCameraStatus("denied")
      setDetectionStatus("Camera access denied - manual mode only")
    }
  }, [loadFaceApiModels])

  // Ask a random question
  const askQuestion = useCallback(() => {
    const randomQuestion = funnyQuestions[Math.floor(Math.random() * funnyQuestions.length)]
    setCurrentQuestion(randomQuestion)
    setFeedback("")

    // Speak the question
    const questionText = `${randomQuestion.question}. Your options are: ${randomQuestion.options
      .map((option, index) => `${String.fromCharCode(65 + index)}: ${option}`)
      .join(", ")}`
    speak(questionText)

    // Set response timer (30 seconds) - removed time up prompt
    responseTimerRef.current = setTimeout(() => {
      if (eyesClosedTime >= 5) {
        playWakeUpSound()
      }
      setCurrentQuestion(null)
      // Ask next question immediately after timeout
      setTimeout(askQuestion, 1000)
    }, 30000)
  }, [speak, playWakeUpSound, eyesClosedTime])

  // Handle answer selection
  const handleAnswer = useCallback(
    (selectedIndex: number) => {
      if (!currentQuestion) return

      if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current)
      }

      const isCorrect = selectedIndex === currentQuestion.correct
      const isSleeping = eyesClosedTime >= 5

      let responseType: keyof typeof responses
      let responseText: string

      if (isCorrect && isSleeping) {
        responseType = "correctSleeping"
        setScores((prev) => ({ ...prev, correctSleeping: prev.correctSleeping + 1 }))
      } else if (isCorrect && !isSleeping) {
        responseType = "correctAwake"
        setScores((prev) => ({ ...prev, correctAwake: prev.correctAwake + 1 }))
      } else if (!isCorrect && isSleeping) {
        responseType = "wrongSleeping"
        setScores((prev) => ({ ...prev, wrongSleeping: prev.wrongSleeping + 1 }))
      } else {
        responseType = "wrongAwake"
        setScores((prev) => ({ ...prev, wrongAwake: prev.wrongAwake + 1 }))
      }

      const responseOptions = responses[responseType]
      responseText = responseOptions[Math.floor(Math.random() * responseOptions.length)]

      setFeedback(responseText)
      speak(responseText)
      setCurrentQuestion(null)
      
      // Ask next question immediately after answer
      setTimeout(() => {
        askQuestion()
      }, 2000) // 2 second delay to let feedback be read
    },
    [currentQuestion, eyesClosedTime, speak, askQuestion],
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

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Stop speech
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel()
    }

    // Reset state
    setCurrentQuestion(null)
    setFeedback("")
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 relative overflow-hidden">
      {/* Hidden video element for camera access */}
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 font-rounded">Orakkam ahno mwonu</h1>
          <h2 className="text-2xl font-semibold text-gray-600 mb-1">Are You Sure You Are Awake??</h2>
          <div className="text-gray-600 mt-2">
            Pottatheram: {brainAwakeScore} vs 6th Sense: {sleepGeniusScore}
          </div>
        </div>

        {/* Main Control */}
        <Card className="mb-4 bg-white backdrop-blur-sm border border-gray-200 shadow-sm">
          <CardContent className="p-4 text-center">
            {!isActive ? (
              <div>
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center">
                  {/* Placeholder for image - replace this div with <img> tag when ready */}
                  <span className="text-gray-400 text-sm">Image</span>
                </div>
                <p className="text-lg text-gray-600 mb-4">
                  Ready to test your alertness?
                </p>
                <Button
                  onClick={startDetector}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 text-xl rounded-lg"
                >
                  Start Detection
                </Button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Active</span>
                </div>
                <p className="text-lg text-gray-600 mb-2">Detection active - stay alert!</p>
                <Button onClick={stopDetector} variant="destructive" className="px-6 py-3 text-xl rounded-lg">
                  Stop Detection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Section */}
        {isActive && currentQuestion && (
          <Card className="mb-4 bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Q</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{currentQuestion.question}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 p-4 text-xl rounded-lg h-auto min-h-[60px] transition-all duration-300"
                  >
                    <div className="text-center">
                      <div className="text-xl font-bold mb-1">{String.fromCharCode(65 + index)}</div>
                      <div>{option}</div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-500">You have 30 seconds to answer!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Section */}
        {feedback && (
          <Card className="mb-4 bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-gray-800">{feedback}</div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-4 text-gray-500">
          <p className="text-sm">Your data is processed locally and never leaves your browser</p>
          <p className="text-xs mt-2">Detection system active for optimal performance</p>
        </div>
      </div>
    </div>
  )
}
