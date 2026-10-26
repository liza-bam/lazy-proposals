// Puts an email's HTML and plain text on the clipboard. osascript -l JavaScript clipboard.js <html file> <text file>
ObjC.import('AppKit');
function run(argv) {
  const read = (p) => $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
  const pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  pb.setStringForType(read(argv[0]), 'public.html');
  pb.setStringForType(read(argv[1]), 'public.utf8-plain-text');
}
