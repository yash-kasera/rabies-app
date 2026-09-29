// All user-facing text, English + Hindi (natural spoken Hindi). Copy follows the design system:
// plain words, sentence case, no exclamation marks, action first.

class S {
  final bool isHindi;
  const S._(this.isHindi);
  static const en = S._(false);
  static const hi = S._(true);

  String _t(String e, String h) => isHindi ? h : e;

  // Common
  String get app => _t('Rabies Response', 'रेबीज़ रिस्पॉन्स');
  String get city => _t('Jabalpur', 'जबलपुर');
  String get offline => _t('You are offline.', 'आप ऑफ़लाइन हैं।');
  String get offlineMsg => _t('Showing saved information.', 'सेव की गई जानकारी दिख रही है।');
  String get retry => _t('Retry', 'फिर कोशिश करें');
  String get back => _t('Back', 'वापस');
  String get langBtn => _t('हिंदी', 'English');
  String get required => _t('Required', 'ज़रूरी है');
  String get dark => _t('Dark', 'डार्क');
  String get light => _t('Light', 'लाइट');
  List<String> get nav => isHindi
      ? const ['होम', 'जानकारी', 'सावधानियाँ', 'सूचनाएं', 'शिकायतें']
      : const ['Home', 'Info', 'Precautions', 'Alerts', 'Reports'];

  /// Label for an API enum value (report status, severity, notice category, animal, condition).
  String status(String key) => (isHindi ? _hiStatus : _enStatus)[key] ?? key;
  static const _enStatus = {
    'Reported': 'Reported', 'Accepted': 'Accepted', 'UnderTreatment': 'Under Treatment', 'Completed': 'Completed', 'Cancelled': 'Cancelled',
    'MinorScratch': 'Minor Scratch', 'BleedingWound': 'Bleeding Wound', 'DeepWound': 'Deep Wound', 'MultipleBites': 'Multiple Bites',
    'OutbreakAlert': 'Outbreak Alert', 'GeneralAwareness': 'General Awareness', 'NewHospital': 'New Hospital', 'MaintenanceNotice': 'Maintenance Notice',
    'Dog': 'Dog', 'Cat': 'Cat', 'Monkey': 'Monkey', 'Bat': 'Bat', 'Other': 'Other',
    'LookedHealthy': 'Looked healthy', 'LookedSickOrAggressive': 'Looked sick or aggressive', 'Stray': 'Stray',
    'OwnedAndVaccinated': 'Owned & vaccinated', 'Unknown': 'Unknown',
  };
  static const _hiStatus = {
    'Reported': 'दर्ज हुई', 'Accepted': 'स्वीकार की गई', 'UnderTreatment': 'इलाज चल रहा है', 'Completed': 'पूरा हुआ', 'Cancelled': 'रद्द',
    'MinorScratch': 'हल्की खरोंच', 'BleedingWound': 'खून निकलता घाव', 'DeepWound': 'गहरा घाव', 'MultipleBites': 'कई जगह काटा',
    'OutbreakAlert': 'प्रकोप चेतावनी', 'GeneralAwareness': 'सामान्य जानकारी', 'NewHospital': 'नया अस्पताल', 'MaintenanceNotice': 'रखरखाव सूचना',
    'Dog': 'कुत्ता', 'Cat': 'बिल्ली', 'Monkey': 'बंदर', 'Bat': 'चमगादड़', 'Other': 'अन्य',
    'LookedHealthy': 'स्वस्थ दिख रहा था', 'LookedSickOrAggressive': 'बीमार या आक्रामक दिख रहा था', 'Stray': 'आवारा',
    'OwnedAndVaccinated': 'पालतू और टीका लगा', 'Unknown': 'पता नहीं',
  };

  // Login
  String get loginTitle => _t('Log in', 'लॉग इन करें');
  String get loginSub => _t('Report animal bites and find a hospital fast.', 'जानवर के काटने की शिकायत करें और जल्दी अस्पताल खोजें।');
  String get loginId => _t('Phone number or email', 'फ़ोन नंबर या ईमेल');
  String get password => _t('Password', 'पासवर्ड');
  String get show => _t('Show', 'दिखाएं');
  String get hide => _t('Hide', 'छिपाएं');
  String get loginBtn => _t('Log in', 'लॉग इन करें');
  String get forgotLink => _t('Forgot password?', 'पासवर्ड भूल गए?');
  String get noAccount => _t("Don't have an account?", 'खाता नहीं है?');
  String get signupLink => _t('Sign up', 'साइन अप करें');
  String get loginInvalid => _t('Wrong phone number, email or password. Please check and try again.',
      'फ़ोन नंबर, ईमेल या पासवर्ड गलत है। जाँचें और फिर कोशिश करें।');
  String get connError => _t('Connection error. Check your internet and try again.',
      'इंटरनेट से कनेक्ट नहीं हो पाया। इंटरनेट जाँचें और फिर कोशिश करें।');
  String get portalOnly => _t('Hospital and government accounts must use their web portal.',
      'अस्पताल और सरकारी खाते अपने वेब पोर्टल पर लॉग इन करें।');

  // Forgot password
  String get forgotTitle => _t('Reset your password', 'पासवर्ड रीसेट करें');
  String get forgotBody => _t('Enter the phone number or email you used to sign up. We will send you a code to set a new password.',
      'साइन अप के समय दिया फ़ोन नंबर या ईमेल डालें। नया पासवर्ड बनाने के लिए हम आपको एक कोड भेजेंगे।');
  String get forgotField => _t('Phone or email', 'फ़ोन या ईमेल');
  String get cancel => _t('Cancel', 'रद्द करें');
  String get resetBtn => _t('Reset password', 'पासवर्ड रीसेट करें');
  String get forgotDoneTitle => _t('Request received', 'अनुरोध मिल गया');
  String forgotDoneBody(String id) => _t('If an account exists for $id, we will send a reset code by SMS. It may take a few minutes.',
      'अगर $id पर खाता है, तो हम SMS से रीसेट कोड भेजेंगे। इसमें कुछ मिनट लग सकते हैं।');
  String get ok => _t('OK', 'ठीक है');

  // Sign up
  String get signupTitle => _t('Create account', 'खाता बनाएं');
  String get fullName => _t('Full name', 'पूरा नाम');
  String get phone => _t('Phone number', 'फ़ोन नंबर');
  String get phoneHint => _t('10 to 15 digits', '10 से 15 अंक');
  String get cityLabel => _t('City', 'शहर');
  String get cityHint => _t('More cities coming soon', 'और शहर जल्द आ रहे हैं');
  String get email => _t('Email', 'ईमेल');
  String get optional => _t('(optional)', '(ज़रूरी नहीं)');
  String get pwHint => _t('At least 8 characters', 'कम से कम 8 अक्षर');
  String get confirmPw => _t('Confirm password', 'पासवर्ड फिर से डालें');
  String get signupBtn => _t('Sign up', 'साइन अप करें');
  String get haveAccount => _t('Already have an account?', 'पहले से खाता है?');
  String get ePhone => _t('Enter 10 to 15 digits', '10 से 15 अंक डालें');
  String get eEmail => _t('This email does not look right', 'यह ईमेल सही नहीं लग रहा');
  String get ePw => _t('Use at least 8 characters', 'कम से कम 8 अक्षर रखें');
  String get ePw2 => _t('Passwords do not match', 'दोनों पासवर्ड एक जैसे नहीं हैं');
  String get eCities => _t('Could not load cities. Check your internet.', 'शहर लोड नहीं हो पाए। इंटरनेट जाँचें।');

  // Home
  String hello(String name) => _t('Namaste, $name', 'नमस्ते, $name');
  String get bigBtn => _t('Report a Bite', 'जानवर के काटने की शिकायत करें');
  String get bigSub => _t('Bitten or scratched by an animal? Tap here. Hospitals are told right away.',
      'किसी जानवर ने काटा या खरोंचा? यहाँ दबाएं। अस्पतालों को तुरंत बताया जाएगा।');
  String get prec => _t('Precautions', 'सावधानियाँ');
  String get precSub => _t('First aid steps', 'प्राथमिक उपचार के कदम');
  String get info => _t('Rabies Info', 'रेबीज़ की जानकारी');
  String get infoSub => _t('Learn about rabies', 'रेबीज़ के बारे में जानें');
  String get casesInCity => _t('Cases in your city', 'आपके शहर में मामले');
  String get casesSub => _t('this month in Jabalpur', 'इस महीने जबलपुर में');
  String get cityStats => _t('City stats', 'शहर के आंकड़े');
  String get changeTheme => _t('Change theme', 'थीम बदलें');
  String get logout => _t('Log out', 'लॉग आउट');
  /// "18% more than last month" / "5% fewer…" / "Same as last month".
  String trendVsLastMonth(int pct) => pct > 0
      ? _t('$pct% more than last month', 'पिछले महीने से $pct% ज़्यादा')
      : pct < 0
          ? _t('${-pct}% fewer than last month', 'पिछले महीने से ${-pct}% कम')
          : _t('Same as last month', 'पिछले महीने जितने');

  // Session
  String get sessionTitle => _t('Your session has expired', 'आपका सत्र समाप्त हो गया है');
  String get sessionBody => _t('Please log in again. Your reports are saved.', 'कृपया फिर से लॉग इन करें। आपकी शिकायतें सुरक्षित हैं।');
  String get sessionBtn => _t('Log in again', 'फिर से लॉग इन करें');

  // Report a bite
  String get reportTitle => _t('Report a Bite', 'काटने की शिकायत');
  String get who => _t('Who was bitten?', 'किसे काटा?');
  String get victimName => _t('Victim name', 'पीड़ित का नाम');
  String get contactNumber => _t('Contact number', 'संपर्क नंबर');
  String get fromProfile => _t('Filled from your profile. Change if someone else was bitten.',
      'आपकी प्रोफ़ाइल से भरा गया। किसी और को काटा हो तो बदलें।');
  String get detecting => _t('Finding your location…', 'आपकी जगह ढूंढ रहे हैं…');
  String get detectingSub => _t('Keep this screen open. This can take a few seconds.', 'यह स्क्रीन खुली रखें। कुछ सेकंड लग सकते हैं।');
  String get precise => _t('Location found', 'जगह मिल गई');
  String preciseSub(int meters) => _t('Jabalpur · accurate to $meters m', 'जबलपुर · $meters मीटर तक सही');
  String get approx => _t('Approximate location only', 'सिर्फ़ अंदाज़न जगह');
  String get approxSub => _t('Location permission denied. Hospitals will see your area, not the exact spot.',
      'जगह की अनुमति नहीं मिली। अस्पताल को आपका इलाका दिखेगा, सही जगह नहीं।');
  String get noLoc => _t('Location not available', 'जगह नहीं मिल पाई');
  String get noLocSub => _t('GPS is off or no signal. Turn on location and try again.',
      'GPS बंद है या सिग्नल नहीं है। लोकेशन चालू करें और फिर कोशिश करें।');
  String get whichAnimal => _t('Which animal?', 'कौन सा जानवर?');
  String get animalLook => _t('How did the animal look?', 'जानवर कैसा दिख रहा था?');
  String get howBad => _t('How bad is the wound?', 'घाव कितना गंभीर है?');
  List<String> get sevDesc => isHindi
      ? const ['त्वचा पर खरोंच, खून नहीं', 'त्वचा फटी, खून निकल रहा है', 'गहरा कटा या फटा घाव', 'कई जगह काटा, या सिर / चेहरे / गर्दन पर']
      : const ['Skin scratched, no blood', 'Skin broken, bleeding', 'Deep cut or torn skin', 'Bitten in many places, or on head / face / neck'];
  String get photoTitle => _t('Photo of the wound', 'घाव की फ़ोटो');
  String get photoHint => _t('Needed so the hospital can see how serious it is. Only hospitals and health officials can see it.',
      'इससे अस्पताल गंभीरता समझ सकेगा। यह फ़ोटो सिर्फ़ अस्पताल और स्वास्थ्य अधिकारी देख सकते हैं।');
  String get takePhoto => _t('Take photo', 'फ़ोटो खींचें');
  String get fromGallery => _t('Choose from gallery', 'गैलरी से चुनें');
  String get retakePhoto => _t('Change photo', 'फ़ोटो बदलें');
  String get removePhoto => _t('Remove', 'हटाएं');
  String get needPhoto => _t('Add a photo of the wound', 'घाव की फ़ोटो जोड़ें');
  String get photoTooLarge => _t('This photo is too large. Take it again or choose a smaller one.',
      'फ़ोटो बहुत बड़ी है। फिर से खींचें या छोटी फ़ोटो चुनें।');
  String get cameraError => _t('Could not open the camera. Try choosing from the gallery.', 'कैमरा नहीं खुला। गैलरी से चुनकर देखें।');
  String get describeTitle => _t('Describe the bite', 'काटने के बारे में बताएं');
  String get describeHint => _t('Where on the body, how it happened, anything else the hospital should know',
      'शरीर पर कहाँ, कैसे हुआ, और कुछ भी जो अस्पताल को पता होना चाहिए');
  String get description => _t('Description', 'विवरण');
  String get photo => _t('Photo', 'फ़ोटो');
  String get viewPhoto => _t('View photo', 'फ़ोटो देखें');
  String get photoLoadFailed => _t('Could not load the photo. Check your internet.', 'फ़ोटो लोड नहीं हो पाई। इंटरनेट जाँचें।');
  String get submitReport =>_t('Submit report', 'शिकायत भेजें');
  String get gettingLoc => _t('Getting location…', 'जगह ढूंढ रहे हैं…');
  String get sending => _t('Sending report…', 'शिकायत भेज रहे हैं…');
  String get pickAnimal => _t('Choose the animal', 'जानवर चुनें');
  String get pickSeverity => _t('Choose how bad the wound is', 'घाव की गंभीरता चुनें');
  String get needLocation => _t('Location is needed so nearby hospitals can respond. Tap Retry.',
      'पास के अस्पताल तक शिकायत पहुँचाने के लिए जगह ज़रूरी है। "फिर कोशिश करें" दबाएं।');
  String get sendFailed => _t('Could not send the report. Check your internet and try again.',
      'शिकायत नहीं भेजी जा सकी। इंटरनेट जाँचें और फिर कोशिश करें।');

  // Submitted
  String get sentTitle => _t('Report sent', 'शिकायत भेज दी गई');
  String get reportNumber => _t('Report number', 'शिकायत नंबर');
  String sentToN(int n) => n == 1
      ? _t('Sent to 1 hospital in your city — go there immediately.', 'आपके शहर के 1 अस्पताल को भेजी गई — तुरंत वहाँ जाएं।')
      : _t('Sent to $n hospitals in your city — go to the nearest one immediately.',
          'आपके शहर के $n अस्पतालों को भेजी गई — तुरंत सबसे पास वाले अस्पताल जाएं।');
  String get sentToNone => _t('No hospital in the app has received it yet — go to the nearest hospital or health centre immediately.',
      'ऐप में अभी किसी अस्पताल को नहीं मिली — तुरंत सबसे पास के अस्पताल या स्वास्थ्य केंद्र जाएं।');
  String get nearest => _t('Nearest hospitals', 'सबसे पास के अस्पताल');
  String get call => _t('Call', 'फ़ोन करें');
  String get directions => _t('Directions', 'रास्ता');
  String get backHome => _t('Back to Home', 'होम पर वापस जाएं');
  String get km => _t('km', 'कि.मी.');
  String get mapsFailed => _t('Could not open maps', 'नक्शा नहीं खुल पाया');

  // Info
  String get infoBanner => _t('In an emergency, tap here to report a bite', 'आपातकाल में, काटने की शिकायत के लिए यहाँ दबाएं');
  String get myth => _t('Myth', 'गलत धारणा');
  String get fact => _t('Fact', 'सच');

  // Precautions
  String get firstAid => _t('Immediate First Aid', 'तुरंत प्राथमिक उपचार');
  String get firstAidSub => _t('Do these now, in this order.', 'ये काम अभी, इसी क्रम में करें।');
  String get dos => _t("Do's", 'क्या करें');
  String get donts => _t("Don'ts", 'क्या न करें');
  String get reportNow => _t('Report This Bite Now', 'अभी शिकायत करें');

  // Alerts
  String get alertsTitle => _t('Alerts', 'सूचनाएं');
  String get refreshing => _t('Refreshing…', 'रीफ़्रेश हो रहा है…');
  String get pullToRefresh => _t('Pull down to refresh', 'रीफ़्रेश के लिए नीचे खींचें');
  String get noAlerts => _t('No notifications', 'कोई सूचना नहीं');
  String get noAlertsBody => _t('Notices from the Health Department about rabies in Jabalpur will appear here.',
      'जबलपुर में रेबीज़ के बारे में स्वास्थ्य विभाग की सूचनाएं यहाँ दिखेंगी।');

  // My reports
  String get reportsTitle => _t('My Reports', 'मेरी शिकायतें');
  String get waiting => _t('Waiting for a hospital', 'अस्पताल का इंतज़ार');
  String get noReports => _t('No reports yet', 'अभी कोई शिकायत नहीं');
  String get noReportsBody => _t('If an animal bites you or your family, report it here.',
      'अगर किसी जानवर ने आपको या परिवार को काटा है, तो यहाँ शिकायत करें।');
  String get noReportsBtn => _t('Report a Bite', 'शिकायत करें');
  String get reportsErr => _t('Could not load your reports', 'आपकी शिकायतें लोड नहीं हो पाईं');
  String get reportsErrBody => _t('Check your internet and try again.', 'इंटरनेट जाँचें और फिर कोशिश करें।');
  String get tryAgain => _t('Try again', 'फिर कोशिश करें');

  // Report detail
  String get victim => _t('Victim', 'पीड़ित');
  String get contact => _t('Contact', 'संपर्क');
  String get animal => _t('Animal', 'जानवर');
  String get severity => _t('Severity', 'गंभीरता');
  String get hospital => _t('Hospital', 'अस्पताल');
  String get vaccineSchedule => _t('Vaccine schedule', 'टीकों का समय');
  String dosesGiven(int given, int total) => _t('$given of $total doses given', '$total में से $given टीके लगे');
  String get nextDose => _t('Next dose due', 'अगला टीका');
  String day(int d) => _t('Day $d', 'दिन $d');
  String get given => _t('Given', 'लगा');
  String get due => _t('Due', 'बाकी');
  String get upcoming => _t('Upcoming', 'आने वाला');
  String get scheduled => _t('Scheduled', 'तय तारीख');
  String get close => _t('Close', 'बंद करें');
  String get noScheduleYet => _t('The vaccine schedule appears here once a hospital accepts your report.',
      'अस्पताल के शिकायत स्वीकार करने के बाद टीकों का समय यहाँ दिखेगा।');
  String explain(String status) => switch (status) {
        'Reported' => _t('Reported — waiting for a hospital to accept. Go to the nearest hospital now; do not wait.',
            'दर्ज हुई — अस्पताल के स्वीकार करने का इंतज़ार है। इंतज़ार न करें, अभी पास के अस्पताल जाएं।'),
        'Accepted' => _t('Accepted — the hospital is expecting you. Go today.', 'स्वीकार की गई — अस्पताल आपका इंतज़ार कर रहा है। आज ही जाएं।'),
        'UnderTreatment' => _t('Under treatment — keep taking every dose on the right day.', 'इलाज चल रहा है — हर टीका सही दिन पर लगवाएं।'),
        'Completed' => _t('Completed — all doses given. Keep this record.', 'पूरा हुआ — सभी टीके लग गए। यह रिकॉर्ड संभालकर रखें।'),
        _ => _t('Cancelled — this report is closed.', 'रद्द — यह शिकायत बंद है।'),
      };

  // City stats
  String get statsTitle => _t('Cases in Jabalpur', 'जबलपुर में मामले');
  String get casesThisMonth => _t('Cases this month', 'इस महीने के मामले');
  String get regHospitals => _t('Registered hospitals', 'पंजीकृत अस्पताल');
  String get changeVsLast => _t('Change vs last month', 'पिछले महीने से बदलाव');
  String changeText(int pct) => pct > 0
      ? _t('More cases than last month', 'पिछले महीने से ज़्यादा मामले')
      : pct < 0
          ? _t('Fewer cases than last month', 'पिछले महीने से कम मामले')
          : _t('Same as last month', 'पिछले महीने जितने');
  String get last6 => _t('Last 6 months', 'पिछले 6 महीने');
  String get activeNotices => _t('Active notices', 'मौजूदा सूचनाएं');
  String get nearby => _t('Nearby hospitals', 'पास के अस्पताल');
  String get list => _t('List', 'सूची');
  String get map => _t('Map', 'नक्शा');
  String get mapNote => _t('The map uses more data.', 'नक्शे में ज़्यादा डेटा लगता है।');
  String get loadMap => _t('Load map', 'नक्शा लोड करें');
  String get noHosp => _t('No registered hospitals in your city yet', 'आपके शहर में अभी कोई पंजीकृत अस्पताल नहीं');
  String get noHospBody => _t('Go to the nearest government hospital or health centre. You can still report a bite.',
      'सबसे पास के सरकारी अस्पताल या स्वास्थ्य केंद्र जाएं। आप फिर भी शिकायत कर सकते हैं।');
  String get statsErr => _t('Could not load city stats', 'शहर के आंकड़े लोड नहीं हो पाए');
  String get byTehsil => _t('Cases by tehsil', 'तहसील के हिसाब से मामले');
  String get cityMarker => _t('Jabalpur city', 'जबलपुर शहर');
  String get legend => _t('Cases this month', 'इस महीने के मामले');
  String get mapLabel => _t('Map of Jabalpur district tehsils', 'जबलपुर जिले की तहसीलों का नक्शा');
  String get cases => _t('cases', 'मामले');
  String areaDelta(int d) => d > 0
      ? _t('$d more than last month', 'पिछले महीने से $d ज़्यादा')
      : d < 0
          ? _t('${-d} fewer than last month', 'पिछले महीने से ${-d} कम')
          : _t('Same as last month', 'पिछले महीने जितने');
  String tehsil(String name) => isHindi ? (_hiTehsil[name] ?? name) : name;
  static const _hiTehsil = {
    'Jabalpur': 'जबलपुर', 'Panagar': 'पनागर', 'Patan': 'पाटन', 'Shahpura': 'शहपुरा',
    'Sihora': 'सिहोरा', 'Majholi': 'मझौली', 'Kundam': 'कुंडम',
    'Adhartal': 'अधारताल', 'Ranjhi': 'रांझी', 'Gorakhpur': 'गोरखपुर',
  };
  String get cityView => _t('Jabalpur city tehsils', 'जबलपुर शहर की तहसीलें');
  String get approxNote => _t('* Borders of Jabalpur, Adhartal and Ranjhi tehsils are approximate.',
      '* जबलपुर, अधारताल और रांझी तहसील की सीमाएं अनुमानित हैं।');
  String get mapLoadFailed => _t('Could not load the map', 'नक्शा लोड नहीं हो पाया');

  // Dates: "Mon 28 Sep" / "सोम 28 सित." — built here so no locale data needs loading.
  String shortDate(DateTime d) {
    final l = d.toLocal();
    final wd = (isHindi ? _hiDays : _enDays)[l.weekday - 1];
    final mo = (isHindi ? _hiMonths : _enMonths)[l.month - 1];
    return '$wd ${l.day} $mo';
  }
  String dayMonth(DateTime d) {
    final l = d.toLocal();
    return '${l.day} ${(isHindi ? _hiMonths : _enMonths)[l.month - 1]}';
  }
  String monthShort(int month) => (isHindi ? _hiMonths : _enMonths)[month - 1];
  static const _enDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const _hiDays = ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'];
  static const _enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  static const _hiMonths = ['जन.', 'फ़र.', 'मार्च', 'अप्रै.', 'मई', 'जून', 'जुला.', 'अग.', 'सित.', 'अक्टू.', 'नव.', 'दिस.'];

  // ---- Static content ----
  List<(String, List<String>)> get infoSections => isHindi
      ? const [
          ('रेबीज़ क्या है?', ['रेबीज़ एक वायरस से होने वाली दिमाग की बीमारी है। यह जानवरों से इंसानों में फैलती है।', 'लक्षण शुरू होने के बाद इससे लगभग हमेशा मौत हो जाती है। लेकिन काटने के बाद टीका लगवाकर इसे पूरी तरह रोका जा सकता है।']),
          ('यह कैसे फैलता है?', ['संक्रमित जानवर की लार से — काटने, खरोंचने, या कटी त्वचा, आँख, नाक या मुँह पर चाटने से।', 'भारत में ज़्यादातर मामले कुत्ते के काटने से होते हैं। बिल्ली, बंदर और चमगादड़ से भी फैल सकता है।']),
          ('लक्षण', ['काटने के हफ़्तों या महीनों बाद लक्षण शुरू हो सकते हैं: बुखार, काटी जगह पर दर्द या झनझनाहट, पानी से डर, घबराहट और निगलने में दिक्कत।', 'लक्षणों का इंतज़ार न करें। कोई भी काटने या खरोंच के बाद तुरंत टीका लगवाएं।']),
          ('समय क्यों ज़रूरी है', ['पहला टीका काटने वाले दिन ही लगे तो सबसे अच्छा काम करता है।', 'सभी 5 टीके सही दिन पर लगवाएं — दिन 0, 3, 7, 14 और 28 — भले ही आप ठीक महसूस करें।']),
          ('गलत धारणाएं और सच', []),
        ]
      : const [
          ('What is rabies?', ['Rabies is a disease of the brain caused by a virus. It spreads from animals to people.', 'Once signs of rabies start, it almost always causes death. But it can be fully prevented with vaccine after a bite.']),
          ('How does it spread?', ['Through the saliva (spit) of an infected animal — by a bite, a scratch, or a lick on broken skin or the eyes, nose or mouth.', 'In India, most cases come from dog bites. Cats, monkeys and bats can also spread it.']),
          ('Symptoms', ['Signs can start weeks or months after the bite: fever, pain or tingling at the bite, fear of water, confusion, and difficulty swallowing.', 'Do not wait for symptoms. Get the vaccine right after any bite or scratch.']),
          ('Why timing matters', ['The vaccine works best when the first dose is given the same day as the bite.', 'Finish all 5 doses on the right days — Day 0, 3, 7, 14 and 28 — even if you feel fine.']),
          ('Myths vs Facts', []),
        ];

  List<(String, String)> get myths => isHindi
      ? const [
          ('सिर्फ़ पागल दिखने वाले कुत्ते से रेबीज़ होता है।', 'स्वस्थ दिखने वाले जानवर में भी रेबीज़ हो सकता है।'),
          ('घाव पर मिर्च, हल्दी या तेल लगाने से फ़ायदा होता है।', 'इनसे घाव और खराब हो सकता है। साबुन-पानी से धोएं, फिर अस्पताल जाएं।'),
          ('छोटी खरोंच पर टीके की ज़रूरत नहीं।', 'त्वचा फटी हो तो डॉक्टर को दिखाएं, आमतौर पर टीका ज़रूरी है।'),
        ]
      : const [
          ('Only mad-looking dogs spread rabies.', 'A healthy-looking animal can also carry rabies.'),
          ('Chilli, turmeric or oil on the wound helps.', 'These can make the wound worse. Wash with soap and water, then go to hospital.'),
          ('A small scratch does not need a vaccine.', 'Any scratch that breaks skin needs a doctor and usually the vaccine.'),
        ];

  /// First-aid steps: (icon key, text). Icon key 'ban' marks a "do not" step.
  List<(String, String)> get steps => isHindi
      ? const [
          ('droplets', 'घाव को साबुन और बहते पानी से 15 मिनट तक धोएं।'),
          ('shield-plus', 'अगर हो तो बीटाडीन या डेटॉल जैसा एंटीसेप्टिक लगाएं।'),
          ('ban', 'घाव को कसकर न बांधें और घरेलू नुस्खे (मिर्च, तेल, हल्दी, चूना) न लगाएं।'),
          ('ban', '"ज़हर" चूसकर निकालने की कोशिश न करें। रेबीज़ साँप के ज़हर जैसा नहीं है।'),
          ('hospital', 'आज ही सबसे पास के अस्पताल जाकर रेबीज़ का टीका लगवाएं।'),
        ]
      : const [
          ('droplets', 'Wash the wound with soap and running water for 15 minutes.'),
          ('shield-plus', 'Apply an antiseptic like Betadine or Dettol, if you have it.'),
          ('ban', 'Do NOT cover the wound tightly or use home remedies (chilli, oil, turmeric, lime).'),
          ('ban', 'Do NOT try to suck out "venom". Rabies does not work like snake poison.'),
          ('hospital', 'Go to the nearest hospital for the anti-rabies vaccine today.'),
        ];

  List<String> get dosList => isHindi
      ? const ['घाव को पूरे 15 मिनट धोएं', 'उसी दिन अस्पताल जाएं', 'सभी 5 टीके समय पर लगवाएं', 'डॉक्टर को जानवर के बारे में बताएं', 'बच्चों को आवारा जानवरों से दूर रखें']
      : const ['Wash the wound for a full 15 minutes', 'Go to hospital the same day', 'Take all 5 vaccine doses on time', 'Tell the doctor about the animal', 'Keep children away from stray animals'];

  List<String> get dontsList => isHindi
      ? const ['जानवर के बीमार होने का इंतज़ार न करें', 'घाव को न सिलवाएं, न कसकर बांधें', 'मिर्च, तेल, हल्दी या चूना न लगाएं', 'डॉक्टर की जगह झाड़-फूंक वाले के पास न जाएं', 'ठीक लगे तब भी कोई टीका न छोड़ें']
      : const ["Don't wait to see if the animal falls sick", "Don't stitch or bandage the wound tightly", "Don't put chilli, oil, turmeric or lime on it", "Don't go to a quack or faith healer instead of a doctor", "Don't skip doses, even if you feel fine"];

  // Voice note (report form)
  String get voiceTitle => _t('Or tell us by voice', 'या बोलकर बताएं');
  String get voiceHint => _t('Speak for up to 2 minutes: where it happened, which animal, where it bit.',
      '2 मिनट तक बोलें: कहाँ हुआ, कौन सा जानवर था, कहाँ काटा।');
  String get voiceRecord => _t('Record voice note', 'आवाज़ रिकॉर्ड करें');
  String get voiceStop => _t('Stop recording', 'रिकॉर्डिंग रोकें');
  String get voiceRecording => _t('Recording', 'रिकॉर्ड हो रहा है');
  String get voicePlay => _t('Play', 'सुनें');
  String get voicePause => _t('Pause', 'रोकें');
  String get voiceRedo => _t('Record again', 'फिर से रिकॉर्ड करें');
  String get voiceDelete => _t('Delete', 'हटाएं');
  String get voiceSaved => _t('Voice note added', 'आवाज़ जोड़ दी गई');
  String get voiceNoMic => _t('Microphone permission is off. Allow it in phone settings to record.',
      'माइक्रोफ़ोन की अनुमति बंद है। रिकॉर्ड करने के लिए फ़ोन सेटिंग में अनुमति दें।');
  String get voiceError => _t('Could not record. Please type instead.', 'रिकॉर्ड नहीं हो पाया। कृपया लिखकर बताएं।');
  String get voiceAttached => _t('Voice note sent', 'आवाज़ भेजी गई');

  // App update
  String get updateTitle => _t('Update available', 'नया अपडेट उपलब्ध है');
  String updateBody(String v) => _t('Version $v is ready. It takes a minute and keeps your data.',
      'वर्ज़न $v तैयार है। इसमें एक मिनट लगेगा, आपकी जानकारी सुरक्षित रहेगी।');
  String get updateNow => _t('Update now', 'अभी अपडेट करें');
  String get updateLater => _t('Later', 'बाद में');
  String get updateRequired => _t('This version is no longer supported. Please update to keep reporting bites.',
      'यह वर्ज़न अब काम नहीं करेगा। शिकायत करते रहने के लिए अपडेट करें।');
  String updateDownloading(int pct) => _t('Downloading update… $pct%', 'अपडेट डाउनलोड हो रहा है… $pct%');
  String get updateInstall => _t('Tap Install when your phone asks.', 'फ़ोन पूछे तो "इंस्टॉल" दबाएं।');
  String get updateFailed => _t('Update could not be downloaded. Try again later.', 'अपडेट डाउनलोड नहीं हो पाया। बाद में कोशिश करें।');
}
