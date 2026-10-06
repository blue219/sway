export interface BilingualEntry {
  en: string
  mi: string
}

export function formatBilingual(entry: BilingualEntry, separator = ' / '): string {
  return `${entry.en}${separator}${entry.mi}`
}

export const movementTranslations: Record<string, BilingualEntry> = {
  'Side Arm Raise': { en: 'Side Arm Raise', mi: 'Hiki Ringa Whakataha' },
  'Standing March': { en: 'Standing March', mi: 'Hīkoi Tū Tonu' },
  'Shallow Squat': { en: 'Shallow Squat', mi: 'Tuohu Pāpaku' },
  'Standing Side Bend': { en: 'Standing Side Bend', mi: 'Pikonga Whakataha ā-Tū' },
  'Side Leg Lift': { en: 'Side Leg Lift', mi: 'Hiki Waewae Whakataha' },
  'Seated torso twist': { en: 'Seated torso twist', mi: 'Whakawiri Tinana ā-Noho' },
  'Seated arm opening': { en: 'Seated arm opening', mi: 'Huaki Ringa ā-Noho' },
  'Seated overhead press': { en: 'Seated overhead press', mi: 'Pēhi Ringa ki Runga ā-Noho' },
  'Seated arm reach': { en: 'Seated arm reach', mi: 'Toro Ringa ā-Noho' },
  'Seated Forward Reach': { en: 'Seated Forward Reach', mi: 'Toro Whakamua ā-Noho' },
}

export const instructions = {
  welcome: {
    instruction: { en: 'Move along with the character', mi: 'Whakakori tahi me te kiripuaki' },
    privacy: { en: 'Camera footage is not recorded or stored', mi: 'Kāore ngā ataata kāmera e hopukina, e tiakina rānei' },
    start: { en: 'Start', mi: 'Tīmata' },
  },
  modeSelection: {
    title: { en: 'Choose how to move', mi: 'Whiriwhiria me pēhea te whakakori' },
    standing: { en: 'Standing', mi: 'E tū' },
    chooseStanding: { en: 'Choose standing', mi: 'Kōwhiria te tū' },
    seated: { en: 'Seated', mi: 'E noho' },
    chooseSeated: { en: 'Choose seated', mi: 'Kōwhiria te noho' },
  },
  movement: {
    start: { en: 'Start', mi: 'Tīmata' },
    skip: { en: 'Skip', mi: 'Hipa' },
    hold: { en: 'Hold', mi: 'Pupuri' },
    nextMovementIn: { en: 'Next movement in', mi: 'Te whakakori e whai ake nei i roto i' },
    timerMode: { en: 'Timer mode', mi: 'Aratau matawā' },
    modelComingSoon: { en: 'Model coming soon', mi: 'Ka tae mai te tauira ā kō tata nei' },
  },
  quiz: {
    guideAlt: { en: 'Raise your left hand to choose A, or your right hand to choose B.', mi: 'Hikitia tō ringa mauī mō A, tō ringa matau rānei mō B' },
    guideCaption: { en: 'Left hand: A · Right hand: B', mi: 'Ringa mauī: A · Ringa matau: B' },
    viewGuide: { en: 'View hand guide', mi: 'Tirohia te aratohu ringa' },
    closeGuide: { en: 'Close guide', mi: 'Katia te aratohu' },
    lowerHand: { en: 'Lower your hand to choose again.', mi: 'Whakahokia iho tō ringa hei kōwhiri anō' },
    starting: { en: 'Starting camera and gesture model…', mi: 'E tīmata ana te kāmera me te tauira tohu…' },
    pausedRecords: { en: 'Hand choices are paused while viewing records.', mi: 'Kua tatari ngā kōwhiringa tohu i te wā e tiro ana ki ngā rekoata' },
    pausedGuide: { en: 'Hand choices pause while the guide or answer is shown.', mi: 'Kua tatari ngā kōwhiringa tohu i te wā e whakaatuhia ana te aratohu me te whakautu' },
    cameraPermissionDenied: { en: 'Camera permission was not granted. Choose A or B on screen.', mi: 'Kāore i whakaaetia te kāmera. Kōwhiria a A, a B rānei i te mata' },
    cameraDisconnected: { en: 'Camera disconnected. Choose A or B on screen.', mi: 'Kua motu te kāmera. Kōwhiria a A, a B rānei i te mata' },
    cameraPaused: { en: 'Camera paused. Choose A or B on screen.', mi: 'Kua tatari te kāmera. Kōwhiria a A, a B rānei i te mata' },
    cameraUnavailable: { en: 'Camera unavailable. Choose A or B on screen.', mi: 'Kāore te kāmera i te wātea. Kōwhiria a A, a B rānei i te mata' },
    modelInvalid: { en: 'Quiz gesture model is invalid. Choose A or B on screen.', mi: 'He muhu te tauira tohu quiz. Kōwhiria a A, a B rānei i te mata' },
    modelError: { en: 'Quiz gesture model could not load. Choose A or B on screen.', mi: 'Kua rahua te uta i te tauira tohu quiz. Kōwhiria a A, a B rānei i te mata' },
    recognitionStopped: { en: 'Gesture recognition stopped. Choose A or B on screen.', mi: 'Kua tū te tautuhi tohu. Kōwhiria a A, a B rānei i te mata' },
    questionCount: (current: number, total: number): BilingualEntry => ({
      en: `Question ${current} of ${total}`,
      mi: `Pātai ${current} o ${total}`,
    }),
  },
  header: {
    goBack: { en: 'Go back', mi: 'Hoki whakamuri' },
    points: { en: 'Points', mi: 'Piha' },
    records: { en: 'Records', mi: 'Rekoata' },
  },
  fallbackModal: {
    title: { en: 'Pose recognition unavailable', mi: 'Kāore te tautuhi tū i te wātea' },
    prompt: { en: 'Continue with a five-second timer for each remaining movement?', mi: 'Me haere tonu me te matawā hēkona e rima mō ia whakakori e toe ana?' },
    notNow: { en: 'Not now', mi: 'Kaua i nāianei' },
    continueAction: { en: 'Continue', mi: 'Haere tonu' },
  },
  recordsModal: {
    title: { en: 'Score history', mi: 'Hītori piro' },
    close: { en: 'Close', mi: 'Katia' },
    clearAll: { en: 'Clear all records', mi: 'Whakakorehia ngā rekoata katoa' },
  },
  result: {
    eyebrow: { en: 'Round complete', mi: 'Kua oti te rauna' },
    title: { en: 'Well done!', mi: 'Ka rawe!' },
    playAgain: { en: 'Play another round', mi: 'Tākaro anō i tētahi rauna' },
    historyTitle: { en: 'Score history', mi: 'Hītori piro' },
    clearAll: { en: 'Clear all records', mi: 'Whakakorehia ngā rekoata katoa' },
  },
} as const
