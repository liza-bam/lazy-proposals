-- A new Mail message from the sender to the recipient, with the clipboard pasted into its body. Never sent.
-- osascript compose.applescript <from> <to> <subject> [<attachment file>]
on run argv
	set {fromAddr, toAddr, subj, attachPath} to argv
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
		-- The paste goes to the front app, so it waits for Mail to be in front and never types anywhere else.
		set frontmost to true
		repeat 20 times
			if frontmost then exit repeat
			delay 0.2
		end repeat
		if not frontmost then error "Mail did not come to the front; nothing was pasted."
		perform action "AXRaise" of w
		set body to UI element 1 of UI element 1 of UI element 1 of (first UI element of w whose role is "AXGroup")
		set focused of body to true
		delay 0.4
		if not frontmost then error "Mail lost the front; nothing was pasted."
		keystroke "v" using command down
	end tell
	if attachPath is not "" then
		delay 0.5
		tell application "Mail" to tell content of m to make new attachment with properties {file name:(POSIX file attachPath as alias)} at after last paragraph
	end if
end run
