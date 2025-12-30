# Quick Troubleshooting Guide - Decryption Errors

## If You See "[Decryption Error]" Messages

### Quick Fix #1: Refresh Browser (Usually Works)
```
1. Press F5 or Ctrl+R to refresh the page
2. Your encryption sessions will be automatically cleaned up
3. Re-open the conversation
4. Messages should now appear correctly
```

### Quick Fix #2: Clear Browser Storage
```
1. Press F12 to open Developer Tools
2. Go to Application → Storage → Local Storage
3. Select your chat app domain and click "Clear All"
4. Refresh the page
5. Re-login to your account
```

### Quick Fix #3: Manual Session Recovery (Advanced)
If you want to see what's happening, you can use the browser console:

```javascript
// Check encryption session health
SessionRecoveryUtil.getSessionStatus()

// Clear sessions for a specific user
SessionRecoveryUtil.clearSessionForUser('USER_ID')

// Clear ALL encryption sessions
SessionRecoveryUtil.clearAllSessions()

// Nuclear option - reset everything and reload
SessionRecoveryUtil.emergencyReset()
```

### Quick Fix #4: Log Out and Log Back In
```
1. Click Logout button
2. Clear browser cookies (optional but recommended)
3. Log back in with your credentials
4. Fresh encryption sessions will be established
```

## Understanding the Error

**What causes it:**
- Long delays between messages (1+ hours)
- Network interruptions
- Browser crashes while app is open
- Corrupted session data in browser storage

**What happens now:**
- ✅ App automatically tries to fix it
- ✅ If fix fails, shows plaintext message instead of error
- ✅ Session is refreshed for next message
- ✅ No messages are lost

## Monitoring Session Health

### Check Status Command
```javascript
// In browser console (F12):
SessionRecoveryUtil.getSessionStatus()

// Output example:
{
  totalSessionRecords: 5,
  totalCachedMessages: 42,
  identityKeys: 1,
  preKeys: 10,
  signedPreKeys: 1,
  sessions: [...]
}
```

### Check Specific User's Session
```javascript
SessionRecoveryUtil.validateSession('USER_ID_HERE')

// Healthy response:
{ valid: true, reason: "Session appears healthy", size: 1250 }

// Corrupted response:
{ valid: false, reason: "Session data too small (corrupted?)" }
```

## For Developers

### Enable Detailed Logging
Add this to your browser console to see encryption operations:
```javascript
// View all decryption attempts
localStorage.getItem('dec_msg_') 

// Check Signal session records
Object.keys(localStorage).filter(k => k.startsWith('sess_'))

// Export encryption diagnostics
const diagnostics = {
  sessions: Object.keys(localStorage).filter(k => k.startsWith('sess_')).length,
  messages: Object.keys(localStorage).filter(k => k.startsWith('dec_msg_')).length,
  keys: Object.keys(localStorage).filter(k => k.includes('Key')).length
};
console.log(diagnostics);
```

## When to Use Each Fix

| Situation | Solution |
|-----------|----------|
| One message shows error | Refresh page |
| Multiple old messages showing errors | Clear localStorage → Re-login |
| App keeps crashing on decryption | Emergency reset (SessionRecoveryUtil.emergencyReset()) |
| Just received a message and can't decrypt | Wait 5 seconds and refresh |
| Consistent issues with one user | Clear that user's session (SessionRecoveryUtil.clearSessionForUser()) |

## Important Notes

⚠️ **DO NOT:**
- Don't manually edit localStorage (can make it worse)
- Don't clear cookies while in a conversation
- Don't clear encryption data while sending messages

✅ **DO:**
- Refresh the page regularly
- Log out before clearing storage
- Report errors with timestamp and usernames
- Check your internet connection first

## Prevention Tips

1. **Keep app updated** - Ensure you're using the latest version
2. **Stable internet** - Keep connection stable while chatting
3. **Avoid tab switching** - Keep tab focused during active conversations
4. **Regular logout** - Log out at end of day to clean sessions
5. **Browser maintenance** - Clear old data periodically

## Still Having Issues?

Try these in order:
1. ✅ Refresh page
2. ✅ Clear browser storage and re-login
3. ✅ Log out completely, wait 10 seconds, log back in
4. ✅ Try a different browser
5. ✅ Emergency reset: `SessionRecoveryUtil.emergencyReset()`
6. ✅ Contact support with error details from browser console

---

**Last Updated**: December 2025  
**Status**: All fixes deployed and tested
