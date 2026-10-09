# Computed document typography

The typography regression applies the actual application CSS to an isolated JSDOM document and checks the computed 17px root scale and system body font. Parsed declarations retain the Tailwind font-token, global small-text and fixed-header policies without matching CSS formatting or comments. Next supplies the existing PostCSS parser; no dependency or production source changes. Documents are closed and external resources are not downloaded.

JSDOM does not compile Tailwind, apply responsive media queries or measure geometry, cascade layers and hit testing. Native actual-main snapshot checks remain separate. Projects retains its existing sidebar/shadow/mobile stacking checks until relevant replacements are proved. This change does not claim completion of the wider MAIR-437 audit, actual green audit CI or authenticated dev behavior.
