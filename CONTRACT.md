# LiveLens — Frontend ↔ Backend Contract

## WebSocket Endpoint
wss://[cloud-run-url]/ws/{session_id}
Local development: ws://localhost:8000/ws/{session_id}
Mock server: ws://localhost:8765

## Frontend SENDS to Backend

### 1. Audio chunk (binary)
- Format: PCM 16-bit, 16kHz, mono
- Frequency: every 100ms

### 2. Session start signal (JSON)
{
  "type": "session_start",
  "uid": "string",
  "role": "string",
  "company": "string",
  "session_type": "mock_interview | debate | presentation"
}

### 3. Calibration complete signal (JSON)
{
  "type": "calibration_complete",
  "baseline": {
    "filler_per_min": 4.2,
    "posture_score": 0.78,
    "eye_contact_pct": 65,
    "wpm": 142
  }
}

### 4. Posture/gaze signal (JSON) — only send on change
{
  "type": "signal",
  "posture_drop": true,
  "gaze_loss": false,
  "filler_count": 4
}

### 5. Session end signal (JSON)
{
  "type": "session_end"
}

## Backend SENDS to Frontend

### 1. Coaching audio (binary)
- Format: PCM 24kHz audio bytes from Gemini

### 2. Coaching text (JSON)
{
  "type": "coaching_text",
  "text": "You said basically four times..."
}

### 3. Session ready signal (JSON)
{
  "type": "session_ready",
  "session_count": 2,
  "prior_summary": "Last time you struggled with eye contact..."
}

### 4. Turn anchor (JSON)
{
  "type": "turn_anchor",
  "last_sentence": "My experience with Python includes..."
}

### 5. Session summary (JSON)
{
  "type": "session_summary",
  "filler_wpm_start": 8.2,
  "filler_wpm_end": 4.9,
  "eye_contact_avg": 71,
  "posture_avg": 0.82,
  "argument_score": 7.4,
  "top_strength": "Logical structure",
  "focus_area": "Eye contact on salary questions",
  "spoken_summary": "Great session. Strong logical structure throughout."
}

### 6. Error signal (JSON)
{
  "type": "error",
  "code": "GEMINI_UNAVAILABLE | FIRESTORE_WRITE_FAILED",
  "message": "string",
  "recoverable": true
}
