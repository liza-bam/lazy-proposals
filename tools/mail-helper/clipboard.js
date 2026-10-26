// Puts an email on the clipboard: its HTML and plain text, or (--file) a file to paste as an attachment.
// osascript -l JavaScript clipboard.js <html file> <text file>  |  clipboard.js --file <file>
ObjC.import('AppKit');
function run(argv) {
  const pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  if (argv[0] === '--file') { pb.writeObjects($([$.NSURL.fileURLWithPath(argv[1])])); return; }
  const read = (p) => $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
  pb.setStringForType(read(argv[0]), 'public.html');
  pb.setStringForType(read(argv[1]), 'public.utf8-plain-text');
}
