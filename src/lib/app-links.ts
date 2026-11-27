/**
 * Where to get the SendAGift mobile app, where games and competitions are
 * played. The Play Store link follows from the Android package name. The
 * App Store link needs the app's numeric Apple ID (App Store Connect → App
 * Information → Apple ID); until it is filled in, only the Play Store
 * button shows.
 */
export const playStoreUrl =
  'https://play.google.com/store/apps/details?id=com.sendagift.send_agift_mobile'

/** e.g. 'https://apps.apple.com/app/id1234567890'. Empty hides the button. */
export const appStoreUrl = ''

/** The visitor's phone platform, to put their store first. */
export function phonePlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const agent = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(agent)) return 'ios'
  if (/Android/i.test(agent)) return 'android'
  return 'other'
}
