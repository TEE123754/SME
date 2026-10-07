export const assistantDisclosure = 'Demo assistant — scripted responses';
export const scriptVersion = 'business-rules-v2';
export type SupportedIntent =
  | 'catalogue'
  | 'faq'
  | 'repeat_order'
  | 'prepare_quote'
  | 'order_status'
  | 'preference_proposal'
  | 'human_handoff'
  | 'recommendation'
  | 'after_sales'
  | 'unknown';
export function matchIntent(text: string): SupportedIntent {
  const value = text.toLowerCase().trim();
  if (/\b(pay|verify|approve|refund now|mark paid|delete|reset|bayar|lulus)\b/.test(value))
    return 'unknown';
  if (/\b(owner|human|complaint|pemilik|bantuan)\b/.test(value)) return 'human_handoff';
  if (/\b(recommend|recommendation|suggest|cadangan)\b/.test(value)) return 'recommendation';
  if (/\b(after.sales|support|damaged|broken|rosak)\b/.test(value)) return 'after_sales';
  if (/\b(again|repeat|lagi|ulang)\b/.test(value)) return 'repeat_order';
  if (/\b(status|pesanan saya|my order)\b/.test(value)) return 'order_status';
  if (/\b(preferences|pilihan|favourite|favorite|remember|kegemaran|ingat)\b/.test(value))
    return 'preference_proposal';
  if (/\b(quote|order|pesan|sebut harga|appointment|book|booking|checkout)\b/.test(value))
    return 'prepare_quote';
  if (/\b(deposit|pickup|lead time|waktu|ambil|policy)\b/.test(value)) return 'faq';
  if (/\b(menu|catalogue|products|services|price|harga|produk|brownie|cupcake)\b/.test(value))
    return 'catalogue';
  return 'unknown';
}
export function scriptReply(intent: SupportedIntent, bm: boolean): string {
  const replies: Record<SupportedIntent, [string, string]> = {
    catalogue: [
      'Current published products and prices are below. Use the order form for an exact quote.',
      'Produk dan harga semasa di bawah. Gunakan borang untuk sebut harga tepat.',
    ],
    faq: [
      'These are the current published business facts.',
      'Ini maklumat perniagaan yang diterbitkan sekarang.',
    ],
    repeat_order: [
      'Your latest order is shown as a reference. Choose a fresh exact date and slot in the form; current pricing and capacity apply.',
      'Pesanan terakhir sebagai rujukan. Pilih tarikh dan waktu baharu dalam borang; harga dan kapasiti semasa digunakan.',
    ],
    prepare_quote: [
      'Choose product, quantity, exact pickup date and slot in the form. Review the quote and explicitly confirm; this message does not reserve anything.',
      'Pilih produk, kuantiti, tarikh dan waktu tepat dalam borang. Semak dan sahkan; mesej ini tidak menempah kapasiti.',
    ],
    order_status: [
      'Here are your saved orders and verified payment totals.',
      'Ini pesanan dan jumlah bayaran disahkan anda.',
    ],
    preference_proposal: [
      'To remember a favourite, open Preferences, enable optional memory and explicitly save your choice. No preference has been changed by this message.',
      'Buka Pilihan, aktifkan simpanan pilihan dan simpan secara jelas. Mesej ini tidak mengubah pilihan.',
    ],
    human_handoff: [
      'Owner review has been requested for this conversation. Automated replies are paused until the owner resumes it.',
      'Semakan pemilik diminta. Balasan automatik dijeda sehingga pemilik menyambung.',
    ],
    unknown: [
      'I support menu, pickup/deposit facts, order again, order status, preferences and owner help. Use the form for exact ordering. I cannot approve offers or verify payments.',
      'Saya menyokong menu, maklumat ambil/deposit, pesan lagi, status, pilihan dan bantuan pemilik. Gunakan borang. Saya tidak boleh meluluskan tawaran atau mengesahkan bayaran.',
    ],
    recommendation: [
      'This recommendation uses the published catalogue and optional, explicitly saved preferences. Sparse data can limit relevance.',
      'Cadangan menggunakan katalog dan pilihan yang disimpan dengan izin. Data terhad boleh mempengaruhi kesesuaian.',
    ],
    after_sales: [
      'After-sales support has been sent to the owner for review. Describe the issue and related order. Automated replies are paused.',
      'Sokongan selepas jualan dihantar kepada pemilik. Nyatakan isu dan pesanan berkaitan. Balasan automatik dijeda.',
    ],
  };
  return replies[intent][bm ? 1 : 0];
}
