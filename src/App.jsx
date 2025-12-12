import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

const PREDICTIONS = [
  'Скоро в вашей жизни появится что-то пушистое и милое 🐱',
  'Удача улыбнётся вам три раза на этой неделе ✨',
  'Ожидайте приятный сюрприз от близкого человека 💝',
  'Ваше желание исполнится, но не так, как вы думали 🌟',
  'Впереди весёлое приключение с друзьями 🎉',
  'Скоро вы найдёте то, что давно искали 🔍',
  'Удача в делах сердечных не за горами 💕',
  'Финансовое благополучие постучится в вашу дверь 💰',
  'Новое знакомство изменит вашу жизнь к лучшему 🌈',
  'Ваши мечты начнут сбываться одна за другой ⭐',
  'Скоро вы получите важное сообщение 📱',
  'Путешествие принесёт незабываемые впечатления 🎒',
  'Творческий успех не за горами 🎨',
  'Ваша улыбка сегодня озарит чей-то день ☀️',
  'Маленькое чудо случится совсем скоро 🎁'
]

const SHAKE_THRESHOLD = 15
const SHAKE_DEBOUNCE = 100
const PROGRESS_INCREMENT = 8

function App() {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [progress, setProgress] = useState(0)
  const [shakeIntensity, setShakeIntensity] = useState(0)
  const [prediction, setPrediction] = useState(null)
  const [sensorAvailable, setSensorAvailable] = useState(true)
  const [useFallback, setUseFallback] = useState(false)
  
  const lastShakeTime = useRef(0)
  const accelerationRef = useRef({ x: 0, y: 0, z: 0 })
  const intensityTimeout = useRef(null)

  // Запрос разрешений для iOS
  const requestPermission = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission()
        if (permission === 'granted') {
          setPermissionGranted(true)
          setShowPermissionDialog(false)
          startListening()
        } else {
          setUseFallback(true)
          setSensorAvailable(false)
        }
      } catch (error) {
        console.error('Permission error:', error)
        setUseFallback(true)
        setSensorAvailable(false)
      }
    } else {
      // Для Android и других устройств разрешение не требуется
      setPermissionGranted(true)
      setShowPermissionDialog(false)
      startListening()
    }
  }

  // Обработчик данных акселерометра
  const handleMotion = (event) => {
    const acc = event.accelerationIncludingGravity
    if (!acc || (!acc.x && !acc.y && !acc.z)) return

    const now = Date.now()
    if (now - lastShakeTime.current < SHAKE_DEBOUNCE) return

    const x = acc.x || 0
    const y = acc.y || 0
    const z = acc.z || 0

    const deltaX = Math.abs(x - accelerationRef.current.x)
    const deltaY = Math.abs(y - accelerationRef.current.y)
    const deltaZ = Math.abs(z - accelerationRef.current.z)

    accelerationRef.current = { x, y, z }

    const totalDelta = deltaX + deltaY + deltaZ

    if (totalDelta > SHAKE_THRESHOLD) {
      lastShakeTime.current = now
      
      // Вычисляем интенсивность (0-100)
      const intensity = Math.min(100, (totalDelta / SHAKE_THRESHOLD) * 50)
      setShakeIntensity(intensity)
      
      // Вибрация
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }

      // Увеличиваем прогресс
      setProgress(prev => {
        const newProgress = Math.min(100, prev + PROGRESS_INCREMENT)
        if (newProgress >= 100 && !prediction) {
          showPrediction()
        }
        return newProgress
      })

      // Сброс интенсивности через время
      clearTimeout(intensityTimeout.current)
      intensityTimeout.current = setTimeout(() => {
        setShakeIntensity(0)
      }, 200)
    }
  }

  const startListening = () => {
    if (typeof DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion)
    } else {
      setSensorAvailable(false)
      setUseFallback(true)
    }
  }

  useEffect(() => {
    // Показываем диалог запроса разрешений
    const timer = setTimeout(() => {
      setShowPermissionDialog(true)
    }, 500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('devicemotion', handleMotion)
      clearTimeout(intensityTimeout.current)
    }
  }, [])

  const showPrediction = () => {
    const randomPrediction = PREDICTIONS[Math.floor(Math.random() * PREDICTIONS.length)]
    setPrediction(randomPrediction)
    
    // Длинная вибрация для успеха
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200])
    }
  }

  const handleTryAgain = () => {
    setPrediction(null)
    setProgress(0)
    setShakeIntensity(0)
  }

  const handleShare = async () => {
    const text = `Моё предсказание: ${prediction} 🎁✨\n\nПопробуй и ты получить предсказание от котика!`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Котик с подарками',
          text: text
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Фоллбек для десктопа
      navigator.clipboard.writeText(text)
      alert('Текст скопирован в буфер обмена!')
    }
  }

  // Фоллбек: тряска по тапу
  const handleFallbackShake = () => {
    if (prediction) return
    
    setShakeIntensity(80)
    
    if (navigator.vibrate) {
      navigator.vibrate(15)
    }

    setProgress(prev => {
      const newProgress = Math.min(100, prev + PROGRESS_INCREMENT)
      if (newProgress >= 100 && !prediction) {
        showPrediction()
      }
      return newProgress
    })

    setTimeout(() => setShakeIntensity(0), 200)
  }

  // Вычисляем параметры анимации тряски
  const getShakeAnimation = () => {
    if (shakeIntensity === 0) return { x: 0, y: 0, rotate: 0 }
    
    const intensity = shakeIntensity / 100
    return {
      x: (Math.random() - 0.5) * 20 * intensity,
      y: (Math.random() - 0.5) * 20 * intensity,
      rotate: (Math.random() - 0.5) * 15 * intensity
    }
  }

  return (
    <div className="app">
      <div className="background">
        <div className="star star-1">✨</div>
        <div className="star star-2">⭐</div>
        <div className="star star-3">💫</div>
        <div className="star star-4">✨</div>
        <div className="star star-5">⭐</div>
      </div>

      {/* Диалог запроса разрешений */}
      <AnimatePresence>
        {showPermissionDialog && !permissionGranted && !useFallback && (
          <motion.div
            className="permission-dialog"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="dialog-content">
              <div className="dialog-emoji">🎁</div>
              <h2>Котик готов дарить предсказания!</h2>
              <p>Для магии нужен доступ к датчикам движения</p>
              <button className="button-primary" onClick={requestPermission}>
                Разрешить
              </button>
              <button 
                className="button-secondary" 
                onClick={() => {
                  setUseFallback(true)
                  setShowPermissionDialog(false)
                }}
              >
                Использовать кнопки
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Основной контент */}
      <div className="content">
        <motion.h1 
          className="title"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          Котик с подарками
        </motion.h1>

        {/* Прогресс-бар */}
        {!prediction && (
          <motion.div 
            className="progress-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="progress-label">
              {useFallback ? 'Жми на котика!' : 'Потряси телефон!'}
            </div>
            <div className="progress-bar">
              <motion.div 
                className="progress-fill"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="progress-text">{progress}%</div>
          </motion.div>
        )}

        {/* Котик с подарками */}
        <motion.div
          className="cat-container"
          animate={shakeIntensity > 0 ? getShakeAnimation() : { x: 0, y: 0, rotate: 0 }}
          transition={{ duration: 0.1 }}
          onClick={useFallback ? handleFallbackShake : undefined}
          style={{ cursor: useFallback ? 'pointer' : 'default' }}
        >
          <motion.div 
            className="cat"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="cat-face">
              <div className="cat-ear cat-ear-left"></div>
              <div className="cat-ear cat-ear-right"></div>
              <div className="cat-head">
                <div className="cat-eyes">
                  <div className="cat-eye"></div>
                  <div className="cat-eye"></div>
                </div>
                <div className="cat-nose"></div>
                <div className="cat-mouth">
                  <div className="cat-mouth-left"></div>
                  <div className="cat-mouth-right"></div>
                </div>
                <div className="cat-whiskers cat-whiskers-left">
                  <div className="whisker"></div>
                  <div className="whisker"></div>
                </div>
                <div className="cat-whiskers cat-whiskers-right">
                  <div className="whisker"></div>
                  <div className="whisker"></div>
                </div>
              </div>
            </div>
            <div className="cat-body">
              <div className="cat-arms">
                <div className="cat-arm cat-arm-left"></div>
                <div className="cat-arm cat-arm-right"></div>
              </div>
            </div>
            <motion.div 
              className="gift-bag"
              animate={shakeIntensity > 0 ? {
                rotate: [0, -5, 5, -5, 5, 0],
                scale: [1, 1.05, 1, 1.05, 1]
              } : {}}
              transition={{ duration: 0.3 }}
            >
              🎁
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Карточка с предсказанием */}
        <AnimatePresence>
          {prediction && (
            <motion.div
              className="prediction-card"
              initial={{ scale: 0, rotate: -180, opacity: 0, x: "-50%", y: "-50%" }}
              animate={{ scale: 1, rotate: 0, opacity: 1, x: "-50%", y: "-50%" }}
              exit={{ scale: 0, rotate: 180, opacity: 0, x: "-50%", y: "-50%" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <div className="prediction-content">
                <div className="prediction-icon">🔮</div>
                <p className="prediction-text">{prediction}</p>
                <div className="prediction-buttons">
                  <button className="button-primary" onClick={handleTryAgain}>
                    Ещё предсказание ✨
                  </button>
                  <button className="button-secondary" onClick={handleShare}>
                    Поделиться 📤
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Индикатор фоллбека */}
      {useFallback && !prediction && (
        <motion.div 
          className="fallback-hint"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          👆 Тапай по котику
        </motion.div>
      )}
    </div>
  )
}

export default App

