-- A new Mail message from the sender to the recipient, with the clipboard pasted into its body. Never sent.
-- osascript compose.applescript <from> <to> <subject> <attachment file or ""> <clipboard.js>
on run argv
	set {fromAddr, toAddr, subj, attachPath, clipJs} to argv
	-- Mail may open the message as a tab in another message's window, so it is found by a one-off subject, then renamed.
	set tempSubj to subj & " ·" & (random number from 100000 to 999999)
	tell application "Mail"
		set m to make new outgoing message with properties {subject:tempSubj, sender:fromAddr, visible:true}
		if toAddr is not "" then tell m to make new to recipient at end of to recipients with properties {address:toAddr}
	end tell
	tell application "System Events" to tell process "Mail"
		repeat 40 times
			if exists (first window whose name is tempSubj) then exit repeat
			delay 0.25
		end repeat
		if not (exists (first window whose name is tempSubj)) then error "The new message did not open."
		set w to first window whose name is tempSubj
	end tell
	-- Mail's Edit menu acts on its main window, so this message is made Mail's main window, with Mail in front.
	tell application "Mail" to activate
	tell application "System Events" to tell process "Mail"
		repeat 15 times
			if frontmost then exit repeat
			delay 0.2
		end repeat
		perform action "AXRaise" of w
		set value of attribute "AXMain" of w to true
		delay 0.2
		-- Mail's own Edit › Paste, so the paste lands in this message whichever app is in front; never a keystroke.
		set body to UI element 1 of UI element 1 of UI element 1 of (first UI element of w whose role is "AXGroup")
		-- A click into the body: it brings Mail forward and puts the cursor there, which a script alone cannot.
		set {px, py} to position of body
		click at {px + 30, py + 20}
		delay 0.4
		set focused of body to true
		delay 0.2
		if not (enabled of menu item "Paste" of menu 1 of menu bar item "Edit" of menu bar 1) then error "The message did not take the cursor; nothing was pasted."
		click menu item "Paste" of menu 1 of menu bar item "Edit" of menu bar 1
		delay 0.4
		-- The attachment is pasted too, after the email: scripting it into the content would wipe the pasted email.
		if attachPath is not "" then
			do shell script "osascript -l JavaScript " & quoted form of clipJs & " --file " & quoted form of attachPath
			delay 0.2
			click menu item "Paste" of menu 1 of menu bar item "Edit" of menu bar 1
			delay 0.4
		end if
	end tell
	tell application "Mail" to set subject of m to subj
	-- In front: Mail's own window order, then the window raised, once its title shows the real subject.
	tell application "System Events" to tell process "Mail"
		repeat 20 times
			if exists (first window whose name is subj) then exit repeat
			delay 0.2
		end repeat
	end tell
	tell application "Mail"
		try
			set index of (first window whose name is subj) to 1
		end try
		activate
	end tell
	tell application "System Events" to tell process "Mail"
		try
			perform action "AXRaise" of (first window whose name is subj)
		end try
	end tell
end run
