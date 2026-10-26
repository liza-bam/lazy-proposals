-- A new Mail message from the sender to the recipient, with the clipboard pasted into its body. Never sent.
-- osascript compose.applescript <from> <to> <subject>
on run argv
	set {fromAddr, toAddr, subj} to argv
	tell application "System Events" to set nBefore to count windows of process "Mail"
	tell application "Mail"
		set m to make new outgoing message with properties {subject:subj, sender:fromAddr, visible:true}
		if toAddr is not "" then tell m to make new to recipient at end of to recipients with properties {address:toAddr}
		activate
	end tell
	tell application "System Events" to tell process "Mail"
		-- The new message is the newest window; an older one with the same subject is never touched.
		repeat 40 times
			if (count windows) > nBefore and name of window 1 is subj then exit repeat
			delay 0.25
		end repeat
		set w to window 1
		if name of w is not subj then error "The new message did not open."
		set body to UI element 1 of UI element 1 of UI element 1 of (first UI element of w whose role is "AXGroup")
		set focused of body to true
		delay 0.3
		keystroke "v" using command down
	end tell
end run
