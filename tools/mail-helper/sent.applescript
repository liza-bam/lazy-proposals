-- Has a message with this subject gone to this address since then? Prints its sent day (YYYY-MM-DD), or nothing.
-- osascript sent.applescript <subject> <to address> <seconds ago>
on run argv
	set {subj, toAddr, ago} to argv
	set sinceDate to (current date) - (ago as integer)
	tell application "Mail"
		set hits to (messages of sent mailbox whose subject is subj and date sent > sinceDate)
		repeat with m in hits
			repeat with r in to recipients of m
				if (address of r) is toAddr then
					set d to date sent of m
					return ((year of d) as text) & "-" & text -2 thru -1 of ("0" & ((month of d) as integer)) & "-" & text -2 thru -1 of ("0" & (day of d))
				end if
			end repeat
		end repeat
	end tell
	return ""
end run
