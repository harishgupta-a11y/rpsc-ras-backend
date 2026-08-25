import json
import os

mcqs = []

# Q1
mcqs.append({
    "question_en": "Which of the following statements is unique to the Taragarh Fort of Bundi, distinguishing it from the Taragarh Fort of Ajmer?",
    "question_hi": "निम्नलिखित में से कौन सा कथन बूंदी के तारागढ़ किले के लिए अद्वितीय है, जो इसे अजमेर के तारागढ़ किले से अलग करता है?",
    "options_en": {
        "A": "It was constructed by Barel, the son of the founder of Bundi, and is connected directly to the Garh Palace.",
        "B": "It was converted by the British into a military magazine dump during their occupation.",
        "C": "It houses the prominent tomb of the Sufi saint Miran Shah.",
        "D": "It was built by the Chauhan ruler Ajayraj in the early 11th century."
    },
    "options_hi": {
        "A": "इसका निर्माण बूंदी के संस्थापक के पुत्र बरैल द्वारा किया गया था और यह सीधे गढ़ महल से जुड़ा हुआ है।",
        "B": "इसे ब्रिटिश शासन के दौरान अंग्रेजों द्वारा एक सैन्य शस्त्रागार (मैगजीन डंप) में बदल दिया गया था।",
        "C": "इसमें सूफी संत मीरान साहब की प्रसिद्ध मजार स्थित है।",
        "D": "इसका निर्माण 11वीं शताब्दी की शुरुआत में चौहान शासक अजयराज द्वारा किया गया था।"
    },
    "correct_option": "A",
    "explanation_en": "Taragarh Fort of Bundi was constructed by Rao Barel, the son of the founder of Bundi, and is structurally connected to the Garh Palace. On the other hand, Taragarh Fort of Ajmer was built by Ajayraj Chauhan in 1001 AD, houses Miran Shah's tomb, and was converted into a magazine dump by the British.",
    "explanation_hi": "बूंदी के तारागढ़ किले का निर्माण बूंदी के संस्थापक के पुत्र राव बरैल द्वारा कराया गया था और यह संरचनात्मक रूप से गढ़ महल से जुड़ा हुआ है। दूसरी ओर, अजमेर के तारागढ़ किले का निर्माण 1001 ईस्वी में अजयराज चौहान ने करवाया था, इसमें मीरान शाह की मजार है और इसे अंग्रेजों ने शस्त्रागार (मैगजीन डंप) में तब्दील कर दिया था।"
})

# Q2
mcqs.append({
    "question_en": "Which of the following structural and cultural features is associated with the Achalgarh Fort of Abu Road?",
    "question_hi": "निम्नलिखित में से कौन सी संरचनात्मक और सांस्कृतिक विशेषता आबू रोड के अचलगढ़ किले से जुड़ी हुई है?",
    "options_en": {
        "A": "It is surrounded by three deep moats filled with water from the Kali Sindh.",
        "B": "It houses the temple of Achaleshwar Shiva and is situated near the Mandakini tank.",
        "C": "It contains the world's largest wheeled cannon known as Jaivana.",
        "D": "It was built by Rao Jodha on the Chidiyatunk hill."
    },
    "options_hi": {
        "A": "यह काली सिंध नदी के जल से भरी तीन गहरी खाइयों से घिरा हुआ है।",
        "B": "इसमें अचलेश्वर महादेव का मंदिर स्थित है और यह मंदाकिनी कुंड के समीप स्थित है।",
        "C": "इसमें पहियों पर रखी दुनिया की सबसे बड़ी तोप है जिसे 'जयबाण' के नाम से जाना जाता है।",
        "D": "इसका निर्माण राव जोधा द्वारा चिड़ियाटूँक पहाड़ी पर करवाया गया था।"
    },
    "correct_option": "B",
    "explanation_en": "Achalgarh Fort, located near Abu Road, was renovated/built by Maharana Kumbha. It houses the famous temple of Achaleshwar Shiva and is situated near the Mandakini tank.",
    "explanation_hi": "आबू रोड के निकट स्थित अचलगढ़ किले का निर्माण/जीर्णोद्धार महाराणा कुंभा द्वारा करवाया गया था। इसमें अचलेश्वर महादेव का प्रसिद्ध मंदिर है और यह मंदाकिनी कुंड के पास स्थित है।"
})

# Q3
mcqs.append({
    "question_en": "The Lohagarh Fort of Bharatpur, built by Jat King Suraj Mal in 1733 AD, earned its name as the \"Iron Fort\" primarily because:",
    "question_hi": "1733 ईस्वी में जाट राजा सूरजमल द्वारा निर्मित भरतपुर के लोहागढ़ किले को मुख्य रूप से किस कारण से \"लोहागढ़\" (लौह दुर्ग) का नाम मिला?",
    "options_en": {
        "A": "The entire structural framework of its high ramparts was reinforced with iron pillars.",
        "B": "It was the chief iron-ore smelting and weaponry manufacturing center of the Jat rulers.",
        "C": "It successfully resisted and repelled multiple siege attempts by British forces between 1803 and 1805.",
        "D": "It was built on a massive iron-rich mineral hillock in the plains of eastern Rajasthan."
    },
    "options_hi": {
        "A": "इसके ऊंचे परकोटे के संपूर्ण संरचनात्मक ढांचे को लोहे के खंभों से सुदृढ़ किया गया था।",
        "B": "यह जाट शासकों का मुख्य लौह-अयस्क प्रगलन और हथियार निर्माण केंद्र था।",
        "C": "इसने 1803 और 1805 के बीच ब्रिटिश सेना द्वारा इसे घेरने (घेराबंदी) के कई प्रयासों का सफलतापूर्वक विरोध किया और उन्हें खदेड़ दिया।",
        "D": "इसका निर्माण पूर्वी राजस्थान के मैदानों में एक विशाल लौह-समृद्ध खनिज पहाड़ी पर किया गया था।"
    },
    "correct_option": "C",
    "explanation_en": "Lohagarh Fort (Iron Fort) in Bharatpur was built by Maharaja Suraj Mal in 1733 AD. It is surrounded by three moats and is famous for its invincibility; British forces under Lord Lake tried to capture it multiple times between 1803 and 1805 but failed.",
    "explanation_hi": "भरतपुर के लोहागढ़ किले (लौह दुर्ग) का निर्माण 1733 ईस्वी में महाराजा सूरजमल द्वारा करवाया गया था। यह तीन खाइयों से घिरा हुआ है और अपनी अजेयता के लिए प्रसिद्ध है; लॉर्ड लेक के नेतृत्व में ब्रिटिश सेना ने 1803 और 1805 के बीच इसे जीतने के कई प्रयास किए लेकिन वे असफल रहे।"
})

# Q4
mcqs.append({
    "question_en": "Gagron Fort, a unique example of a water fort (Jal Durg), is built at the strategic confluence of which two rivers?",
    "question_hi": "जल दुर्ग का एक अनूठा उदाहरण, गागरोन का किला, किन दो नदियों के रणनीतिक संगम पर बनाया गया है?",
    "options_en": {
        "A": "Banas and Chambal",
        "B": "Mahi and Som",
        "C": "Gambhiri and Bedach",
        "D": "Kali Sindh and Ahu"
    },
    "options_hi": {
        "A": "बनास और चंबल",
        "B": "माही और सोम",
        "C": "गंभीरी और बेड़च",
        "D": "काली सिंध और आहू"
    },
    "correct_option": "D",
    "explanation_en": "Gagron Fort in Jhalawar is a unique water fort built at the confluence of the Kali Sindh and Ahu rivers. It is also surrounded by a moat on its remaining side, making it highly secure.",
    "explanation_hi": "झालावाड़ का गागरोन किला एक अनूठा जल दुर्ग है जो काली सिंध और आहू नदियों के संगम पर बना है। यह शेष तरफ से एक खाई से भी घिरा हुआ है, जो इसे अत्यधिक सुरक्षित बनाता है।"
})

# Q5
mcqs.append({
    "question_en": "Which of the following is NOT one of the seven historic gates (Pols) of the Mehrangarh Fort in Jodhpur?",
    "question_hi": "निम्नलिखित में से कौन सा जोधपुर के मेहरानगढ़ किले के सात ऐतिहासिक द्वारों (पोल) में से एक नहीं है?",
    "options_en": {
        "A": "Ram Pol",
        "B": "Dedh Kamgra Pol",
        "C": "Loha Pol",
        "D": "Fateh Pol"
    },
    "options_hi": {
        "A": "राम पोल",
        "B": "डेढ़ कांगड़ा पोल",
        "C": "लोहा पोल",
        "D": "फतेह पोल"
    },
    "correct_option": "A",
    "explanation_en": "Mehrangarh Fort has seven gates, which include Fateh Pol, Gopal Pol, Bhairon Pol, Dedh Kamgra Pol, Loha Pol, Suraj Pol, and Amrita Pol. Ram Pol is the primary entrance gate of Chittorgarh Fort, not Mehrangarh.",
    "explanation_hi": "मेहरानगढ़ किले में सात द्वार हैं, जिनमें फतेह पोल, गोपाल पोल, भैरों पोल, डेढ़ कांगड़ा पोल, लोहा पोल, सूरज पोल और अमृता पोल शामिल हैं। राम पोल चित्तौड़गढ़ किले का मुख्य प्रवेश द्वार है, न कि मेहरानगढ़ का।"
})

# Q6
mcqs.append({
    "question_en": "The architectural layout of Nahargarh Fort in Jaipur includes a unique residential block constructed by Sawai Madho Singh II. What is the defining feature of this block?",
    "question_hi": "जयपुर के नाहरगढ़ किले के स्थापत्य प्रारूप में सवाई माधो सिंह II द्वारा निर्मित एक अनूठा आवासीय ब्लॉक शामिल है। इस ब्लॉक की परिभाषित विशेषता क्या है?",
    "options_en": {
        "A": "A set of nine identical suites designed to mirror the solar system's arrangement.",
        "B": "Twelve identical, interconnected suites built for the king's twelve queens.",
        "C": "A massive underground vault linked directly to the Jaigarh treasury.",
        "D": "A circular palace designed to capture wind from all directions."
    },
    "options_hi": {
        "A": "सौर मंडल की व्यवस्था को दर्शाने के लिए बनाए गए नौ समान सुइट्स का एक सेट।",
        "B": "राजा की बारह रानियों के लिए बनाए गए बारह समान और आपस में जुड़े हुए सुइट्स।",
        "C": "जयगढ़ के खजाने से सीधे जुड़ी एक विशाल भूमिगत तिजोरी।",
        "D": "सभी दिशाओं से हवा को रोकने/पकड़ने के लिए डिज़ाइन किया गया एक गोलाकार महल।"
    },
    "correct_option": "B",
    "explanation_en": "Nahargarh Fort, built by Sawai Jai Singh II in 1734 AD and later renovated, has 12 identical suites built for the 12 queens of Sawai Madho Singh II.",
    "explanation_hi": "नाहरगढ़ किले का निर्माण सवाई जय सिंह II द्वारा 1734 ईस्वी में करवाया गया था। इस किले में सवाई माधो सिंह II की 12 रानियों के लिए 12 एक जैसे समान महल (सुइट्स) बने हुए हैं।"
})

# Q7
mcqs.append({
    "question_en": "Which of the following historical claims is true regarding the Junagarh Fort of Bikaner?",
    "question_hi": "बीकानेर के जूनागढ़ किले के संबंध में निम्नलिखित में से कौन सा ऐतिहासिक तथ्य सत्य है?",
    "options_en": {
        "A": "It is situated on a steep, inaccessible triangular hill called Trikuta.",
        "B": "It was built by Rao Jodha to protect the northern desert trade routes.",
        "C": "Built by Rai Singh in 1589 AD, it contains 37 internal palaces and was never captured in battle.",
        "D": "It has a 36-kilometer-long perimeter wall, the second longest in the world."
    },
    "options_hi": {
        "A": "यह त्रिकूटा नामक एक खड़ी, दुर्गम त्रिकोणीय पहाड़ी पर स्थित है।",
        "B": "इसका निर्माण राव जोधा द्वारा उत्तरी रेगिस्तानी व्यापार मार्गों की रक्षा के लिए किया गया था।",
        "C": "1589 ईस्वी में राय सिंह द्वारा निर्मित, इसमें 37 आंतरिक महल हैं और इसे युद्ध में कभी नहीं जीता गया।",
        "D": "इसकी 36 किलोमीटर लंबी परकोटा दीवार है, जो दुनिया में दूसरी सबसे लंबी है।"
    },
    "correct_option": "C",
    "explanation_en": "Junagarh Fort of Bikaner was built by Raja Rai Singh in 1589 AD. It contains 37 internal palaces and is famous for being the only fort in India that was never successfully captured by invaders.",
    "explanation_hi": "बीकानेर का जूनागढ़ किला राजा राय सिंह द्वारा 1589 ईस्वी में बनवाया गया था। इसमें 37 आंतरिक महल हैं और यह भारत का एकमात्र ऐसा किला होने के लिए प्रसिद्ध है जिसे आक्रमणकारियों द्वारा कभी भी सफलतापूर्वक नहीं जीता गया।"
})

# Q8
mcqs.append({
    "question_en": "The defensive architecture of the Jaisalmer Fort (Sonar Qila) is unique because of which of the following features?",
    "question_hi": "जैसलमेर किले (सोनार किला) की रक्षात्मक वास्तुकला निम्नलिखित में से किस विशेषता के कारण अद्वितीय है?",
    "options_en": {
        "A": "A single massive wall made of dark volcanic basalt rock.",
        "B": "A grid of deep water-filled moats fed by the Ghaggar river.",
        "C": "Seven concentric walls made of sun-dried red clay bricks.",
        "D": "A triple-layered defensive wall (ghanghar) built using yellow sandstone without mortar."
    },
    "options_hi": {
        "A": "गहरे रंग के ज्वालामुखीय बेसाल्ट पत्थर से बनी एक विशाल एकल दीवार।",
        "B": "घग्गर नदी के पानी से भरी गहरी खाइयों का एक ग्रिड।",
        "C": "धूप में सुखाई गई लाल मिट्टी की ईंटों से बनी सात संकेंद्रित दीवारें।",
        "D": "बिना गारे (mortar) के पीले बलुआ पत्थर का उपयोग करके बनाई गई तिहरे स्तर की रक्षात्मक दीवार (घांघर)।"
    },
    "correct_option": "D",
    "explanation_en": "Jaisalmer Fort (Sonar Qila) was built by Bhati Rajput Jaisal in 1156 AD on Trikuta Hill. It features a unique triple-layered defensive wall (called Moris/Ghanghar) constructed using yellow sandstone blocks joined without mortar.",
    "explanation_hi": "जैसलमेर किले (सोनार किला) का निर्माण भाटी राजपूत जैसल द्वारा 1156 ईस्वी में त्रिकूट पहाड़ी पर करवाया गया था। इसमें पीले बलुआ पत्थर के ब्लॉकों का उपयोग करके बनाई गई एक अनूठी तिहरे स्तर की रक्षात्मक दीवार (जिसे मोरी या घांघर कहा जाता है) है, जिन्हें बिना गारे के आपस में जोड़ा गया है।"
})

# Q9
mcqs.append({
    "question_en": "Inside the Amber Fort, which famous temple was established by Raja Man Singh I, housing an image of the goddess brought from Jessore (East Bengal)?",
    "question_hi": "आमेर किले के भीतर राजा मान सिंह प्रथम द्वारा किस प्रसिद्ध मंदिर की स्थापना की गई थी, जिसमें जसोर (पूर्वी बंगाल) से लाई गई देवी की मूर्ति स्थापित है?",
    "options_en": {
        "A": "Shila Mata Temple",
        "B": "Achaleshwar Shiva Temple",
        "C": "Jagat Shiromani Temple",
        "D": "Kali Devi Temple"
    },
    "options_hi": {
        "A": "शिला माता मंदिर",
        "B": "अचलेश्वर शिव मंदिर",
        "C": "जगत शिरोमणि मंदिर",
        "D": "काली देवी मंदिर"
    },
    "correct_option": "A",
    "explanation_en": "Raja Man Singh I established the Shila Mata (Durga) Temple inside the Amber Fort. The idol of Shila Mata was brought by Raja Man Singh I from Jessore (in modern Bangladesh/East Bengal) after his victory.",
    "explanation_hi": "राजा मान सिंह प्रथम ने आमेर किले के अंदर शिला माता (दुर्गा) मंदिर की स्थापना की थी। शिला माता की मूर्ति राजा मान सिंह प्रथम द्वारा अपनी विजय के बाद जसोर (आधुनिक बांग्लादेश/पूर्वी बंगाल में) से लाई गई थी।"
})

# Q10
mcqs.append({
    "question_en": "The massive perimeter wall of Kumbhalgarh Fort, built under the supervision of the architect Mandan, is famously known as the \"Great Wall of India\" because of its length of:",
    "question_hi": "वास्तुकार मंडन की देखरेख में निर्मित कुंभलगढ़ किले की विशाल परकोटा दीवार को उसकी कितनी लंबाई के कारण प्रसिद्ध रूप से \"भारत की महान दीवार\" (ग्रेट वॉल ऑफ इंडिया) कहा जाता है?",
    "options_en": {
        "A": "24 kilometers",
        "B": "36 kilometers",
        "C": "48 kilometers",
        "D": "52 kilometers"
    },
    "options_hi": {
        "A": "24 किलोमीटर",
        "B": "36 किलोमीटर",
        "C": "48 किलोमीटर",
        "D": "52 किलोमीटर"
    },
    "correct_option": "B",
    "explanation_en": "Kumbhalgarh Fort, designed by Mandan, features a 36-kilometer-long perimeter wall, which is the second longest continuous wall in the world after the Great Wall of China. It is commonly referred to as the 'Great Wall of India'.",
    "explanation_hi": "मंडन द्वारा डिजाइन किए गए कुंभलगढ़ किले में 36 किलोमीटर लंबी परकोटा दीवार है, जो चीन की महान दीवार के बाद दुनिया की दूसरी सबसे लंबी निरंतर दीवार है। इसे आमतौर पर 'भारत की महान दीवार' कहा जाता है।"
})

# Q11
mcqs.append({
    "question_en": "Ranthambore Fort, situated in Sawai Madhopur, is historically renowned for the heroic resistance of which Chauhan ruler against Alauddin Khilji's forces?",
    "question_hi": "सवाई माधोपुर में स्थित रणथंभौर किला ऐतिहासिक रूप से अलाउद्दीन खिलजी की सेना के खिलाफ किस चौहान शासक के वीर प्रतिरोध के लिए प्रसिद्ध है?",
    "options_en": {
        "A": "Ajayraj Chauhan",
        "B": "Prithviraj Chauhan III",
        "C": "Hammir Dev Chauhan",
        "D": "Vagbhata Chauhan"
    },
    "options_hi": {
        "A": "अजयराज चौहान",
        "B": "पृथ्वीराज चौहान तृतीय",
        "C": "हम्मीर देव चौहान",
        "D": "वाग्भट चौहान"
    },
    "correct_option": "C",
    "explanation_en": "Ranthambore Fort in Sawai Madhopur is famous for Hammir Dev Chauhan's heroic resistance against the Delhi Sultanate ruler Alauddin Khilji, which culminated in the historic siege and Saka of Ranthambore in 1301 AD.",
    "explanation_hi": "सवाई माधोपुर का रणथंभौर किला दिल्ली सल्तनत के शासक अलाउद्दीन खिलजी के खिलाफ हम्मीर देव चौहान के वीर प्रतिरोध के लिए प्रसिद्ध है, जिसके परिणामस्वरूप 1301 ईस्वी में रणथंभौर का ऐतिहासिक साका और घेराबंदी हुई थी।"
})

# Q12
mcqs.append({
    "question_en": "The Jaigarh Fort of Jaipur houses the famous \"Jaivana\" cannon. Which of the following is correct regarding this historic artillery piece?",
    "question_hi": "जयपुर के जयगढ़ किले में प्रसिद्ध \"जयबाण\" तोप रखी है। इस ऐतिहासिक तोपखाने के संबंध में निम्नलिखित में से कौन सा कथन सही है?",
    "options_en": {
        "A": "It is a bronze cannon that was gifted to Sawai Jai Singh II by the Mughal Emperor.",
        "B": "It was used extensively in the Battle of Haldighati against Maharana Pratap.",
        "C": "It is a multi-barrel rocket launcher system designed by Raja Man Singh I.",
        "D": "It is the world's largest cannon on wheels, cast at the gun foundry inside Jaigarh."
    },
    "options_hi": {
        "A": "यह एक कांसे की तोप है जिसे मुगल सम्राट द्वारा सवाई जय सिंह II को उपहार में दिया गया था।",
        "B": "महाराणा प्रताप के खिलाफ हल्दीघाटी के युद्ध में इसका बड़े पैमाने पर इस्तेमाल किया गया था।",
        "C": "यह राजा मान सिंह प्रथम द्वारा डिजाइन की गई एक बहु-बैरल रॉकेट लांचर प्रणाली है।",
        "D": "यह पहियों पर चलने वाली दुनिया की सबसे बड़ी तोप है, जिसे जयगढ़ के भीतर बंदूक कारखाने (तोप ढलाई कारखाने) में ढाला गया था।"
    },
    "correct_option": "D",
    "explanation_en": "The Jaivana cannon, housed in Jaigarh Fort, Jaipur, is the world's largest cannon on wheels. It was cast at the gun foundry located within the Jaigarh Fort complex itself during the reign of Sawai Jai Singh II.",
    "explanation_hi": "जयपुर के जयगढ़ किले में रखी जयबाण तोप पहियों पर चलने वाली दुनिया की सबसे बड़ी तोप है। इसे सवाई जय सिंह II के शासनकाल के दौरान जयगढ़ किला परिसर के भीतर स्थित तोप ढलाई कारखाने में ही ढाला गया था।"
})

# Q13
mcqs.append({
    "question_en": "The Chittorgarh Fort, one of the premier hill forts of Rajasthan, is historically associated with how many Sakas (sacrifices/sieges)?",
    "question_hi": "राजस्थान के प्रमुख पहाड़ी किलों में से एक, चित्तौड़गढ़ किला ऐतिहासिक रूप से कितने साकों (बलिदानों/घेराबंदी) से जुड़ा हुआ है?",
    "options_en": {
        "A": "One",
        "B": "Two",
        "C": "Four",
        "D": "Three"
    },
    "options_hi": {
        "A": "एक",
        "B": "दो",
        "C": "चार",
        "D": "तीन"
    },
    "correct_option": "D",
    "explanation_en": "Chittorgarh Fort is historically famous for witnessing three Sakas: the first in 1303 AD (Alauddin Khilji's invasion), the second in 1535 AD (Bahadur Shah of Gujarat's invasion), and the third in 1567-68 AD (Akbar's invasion).",
    "explanation_hi": "चित्तौड़गढ़ किला ऐतिहासिक रूप से तीन साके देखने के लिए प्रसिद्ध है: पहला 1303 ईस्वी में (अलाउद्दीन खिलजी का आक्रमण), दूसरा 1535 ईस्वी में (गुजरात के बहादुर शाह का आक्रमण), और तीसरा 1567-68 ईस्वी में (अकबर का आक्रमण)।"
})

# Q14 (Statement-based, Correct A)
mcqs.append({
    "question_en": "Consider the following statements about Mehrangarh Fort:\n1. It was founded by Rao Jodha in 1459 AD on the Chidiyatunk hill.\n2. The fort is also known as Mayur Dhwaja due to its peacock-like shape and flag.\n3. The British forces converted this fort into their primary magazine dump in 1857.\nWhich of the statements given above is/are correct?",
    "question_hi": "मेहरानगढ़ किले के बारे में निम्नलिखित कथनों पर विचार कीजिए:\n1. इसकी स्थापना 1459 ईस्वी में राव जोधा द्वारा चिड़ियाटूँक पहाड़ी पर की गई थी।\n2. मोर जैसी आकृति और ध्वज के कारण इस किले को मयूरध्वज भी कहा जाता है।\n3. British सेना ने 1857 में इस किले को अपने मुख्य शस्त्रागार (मैगजीन डंप) में बदल दिया था।\nWhich of the statements given above is/are correct?",
    "options_en": {
        "A": "1 and 2 only",
        "B": "2 and 3 only",
        "C": "1 and 3 only",
        "D": "1, 2 and 3"
    },
    "options_hi": {
        "A": "केवल 1 और 2",
        "B": "केवल 2 और 3",
        "C": "केवल 1 और 3",
        "D": "1, 2 और 3"
    },
    "correct_option": "A",
    "explanation_en": "Mehrangarh Fort was founded by Rao Jodha in 1459 AD on Chidiyatunk/Bhakurchidiya hill and is also called Mayur Dhwaja. However, it was the Taragarh Fort of Ajmer (not Mehrangarh) that was converted by the British into a military magazine dump. Therefore, Statement 3 is incorrect.",
    "explanation_hi": "मेहरानगढ़ किले की स्थापना राव जोधा ने 1459 ईस्वी में चिड़ियाटूँक/भाकुरचिड़िया पहाड़ी पर की थी और इसे मयूरध्वज भी कहा जाता है। हालाँकि, यह अजमेर का तारागढ़ किला (मेहरानगढ़ नहीं) था जिसे अंग्रेजों द्वारा एक सैन्य शस्त्रागार (मैगजीन डंप) में परिवर्तित किया गया था। इसलिए, कथन 3 गलत है।"
})

# Q15 (Statement-based, Correct B)
mcqs.append({
    "question_en": "Consider the following statements regarding the Taragarh forts of Rajasthan:\n1. Taragarh Fort of Ajmer was built by the Bhati Rajputs in 1156 AD.\n2. Taragarh Fort of Bundi was constructed by Barel, the son of Bundi's founder.\n3. Taragarh Fort of Bundi features four massive gates and is connected to the Garh Palace.\nWhich of the statements given above is/are correct?",
    "question_hi": "राजस्थान के तारागढ़ किलों के संबंध में निम्नलिखित कथनों पर विचार कीजिए:\n1. अजमेर के तारागढ़ किले का निर्माण 1156 ईस्वी में भाटी राजपूतों द्वारा किया गया था।\n2. बूंदी के तारागढ़ किले का निर्माण बूंदी के संस्थापक के पुत्र बरैल द्वारा करवाया गया था।\n3. बूंदी के तारागढ़ किले में चार विशाल द्वार हैं और यह गढ़ महल से जुड़ा हुआ है।\nWhich of the statements given above is/are correct?",
    "options_en": {
        "A": "1 and 2 only",
        "B": "2 and 3 only",
        "C": "1 and 3 only",
        "D": "1, 2 and 3"
    },
    "options_hi": {
        "A": "केवल 1 और 2",
        "B": "केवल 2 और 3",
        "C": "केवल 1 और 3",
        "D": "1, 2 और 3"
    },
    "correct_option": "B",
    "explanation_en": "Taragarh Fort of Ajmer was built by Ajayraj Chauhan in 1001 AD (not Bhati Rajputs in 1156 AD, which describes Jaisalmer Fort). Statements 2 and 3 are correct as Taragarh of Bundi was constructed by Rao Barel, has 4 gates, and is connected to the Garh Palace.",
    "explanation_hi": "अजमेर के तारागढ़ किले का निर्माण अजयराज चौहान ने 1001 ईस्वी में करवाया था (न कि 1156 ईस्वी में भाटी राजपूतों द्वारा, जो जैसलमेर किले का विवरण है)। कथन 2 और 3 सही हैं क्योंकि बूंदी के तारागढ़ का निर्माण राव बरैल द्वारा किया गया था, इसमें 4 द्वार हैं और यह गढ़ महल से जुड़ा हुआ है।"
})

# Q16 (Statement-based, Correct C)
mcqs.append({
    "question_en": "Consider the following statements about Kumbhalgarh Fort:\n1. It was built by Maharana Kumbha in the 15th century, with Mandan serving as the chief architect.\n2. The birth of Maharana Pratap took place inside this fort in 1540 AD.\n3. The fort contains more than 360 temples within its extensive complex.\nWhich of the statements given above is/are correct?",
    "question_hi": "कुंभलगढ़ किले के बारे में निम्नलिखित कथनों पर विचार कीजिए:\n1. इसका निर्माण 15वीं शताब्दी में महाराणा कुंभा द्वारा करवाया गया था, जिसमें मंडल ने मुख्य वास्तुकार के रूप में कार्य किया था।\n2. महाराणा प्रताप का जन्म 1540 ईस्वी में इसी किले के भीतर हुआ था।\n3. किले के विस्तृत परिसर के भीतर 360 से अधिक मंदिर स्थित हैं।\nWhich of the statements given above is/are correct?",
    "options_en": {
        "A": "1 and 2 only",
        "B": "2 and 3 only",
        "C": "1, 2 and 3",
        "D": "1 only"
    },
    "options_hi": {
        "A": "केवल 1 और 2",
        "B": "केवल 2 और 3",
        "C": "1, 2 और 3",
        "D": "केवल 1"
    },
    "correct_option": "C",
    "explanation_en": "All three statements are correct. Kumbhalgarh Fort was built by Maharana Kumbha in the 15th century, designed by Mandan, has over 360 temples, and was the birthplace of Maharana Pratap in 1540 AD.",
    "explanation_hi": "तीनों कथन सही हैं। कुंभलगढ़ किले का निर्माण 15वीं शताब्दी में महाराणा कुंभा द्वारा करवाया गया था, जिसे मंडन द्वारा डिजाइन किया गया था, इसमें 360 से अधिक मंदिर हैं, और यह 1540 ईस्वी में महाराणा प्रताप का जन्मस्थान था।"
})

# Q17 (Statement-based, Correct D)
mcqs.append({
    "question_en": "Consider the following statements regarding the Gagron Fort of Jhalawar:\n1. It was originally constructed by the Jat rulers of Bharatpur.\n2. The fort witnessed only one historic Saka in its entire history, which took place in 1423 AD.\n3. It is the birth place of the famous medieval Bhakti saint Pipa Ji.\nWhich of the statements given above is/are correct?",
    "question_hi": "झालावाड़ के गागरोन किले के संबंध में निम्नलिखित कथनों पर विचार कीजिए:\n1. इसका निर्माण मूल रूप से भरतपुर के जाट शासकों द्वारा किया गया था।\n2. इस किले ने अपने पूरे इतिहास में केवल एक ही ऐतिहासिक साका देखा, जो 1423 ईस्वी में हुआ था।\n3. यह प्रसिद्ध मध्यकालीन भक्ति संत पीपा जी का जन्म स्थान है।\nWhich of the statements given above is/are correct?",
    "options_en": {
        "A": "1 and 2 only",
        "B": "2 and 3 only",
        "C": "1 and 3 only",
        "D": "3 only"
    },
    "options_hi": {
        "A": "केवल 1 और 2",
        "B": "केवल 2 और 3",
        "C": "केवल 1 और 3",
        "D": "केवल 3"
    },
    "correct_option": "D",
    "explanation_en": "Gagron Fort was built by Dodiya Rajputs (not Jat rulers) and witnessed two Sakas in 1423 AD and 1444 AD (not one). It is indeed the birthplace of the famous Bhakti saint Pipa Ji. Thus, only statement 3 is correct.",
    "explanation_hi": "गागरोन किले का निर्माण डोडिया राजपूतों द्वारा किया गया था (न कि जाट शासकों द्वारा) और इसने 1423 ईस्वी और 1444 ईस्वी में दो साके देखे (न कि केवल एक)। यह वास्तव में प्रसिद्ध भक्ति संत पीपा जी का जन्मस्थान है। अतः केवल कथन 3 सही है।"
})

# Q18 (AR, Correct A)
mcqs.append({
    "question_en": "Assertion (A): Jaigarh Fort was connected to Amber Fort by a secure underground passage.\nReason (R): This passage was designed to provide a safe escape route for the royal family from Amber Fort to the highly fortified Jaigarh Fort during enemy invasions.",
    "question_hi": "कथन (A): जयगढ़ किले को एक सुरक्षित भूमिगत मार्ग द्वारा आमेर किले से जोड़ा गया था।\nकारण (R): यह मार्ग शत्रु के आक्रमणों के दौरान आमेर किले से अत्यधिक किलेबंद जयगढ़ किले तक शाही परिवार के लिए एक सुरक्षित निकासी मार्ग प्रदान करने के लिए डिज़ाइन किया गया था।",
    "options_en": {
        "A": "Both A and R are true, and R is the correct explanation of A",
        "B": "Both A and R are true, but R is NOT the correct explanation of A",
        "C": "A is true, but R is false",
        "D": "A is false, but R is true"
    },
    "options_hi": {
        "A": "A और R दोनों सही हैं, और R, A की सही व्याख्या है",
        "B": "A और R दोनों सही हैं, किन्तु R, A की सही व्याख्या नहीं है",
        "C": "A सही है, किन्तु R गलत है",
        "D": "A गलत है, किन्तु R सही है"
    },
    "correct_option": "A",
    "explanation_en": "Jaigarh and Amber forts are connected by a subterranean passage. This was built as a defensive measure to allow the royal family to safely retreat to the stronger military fort of Jaigarh during emergencies or sieges at Amber.",
    "explanation_hi": "जयगढ़ और आमेर के किले एक भूमिगत मार्ग से जुड़े हुए हैं। इसका निर्माण एक रक्षात्मक उपाय के रूप में किया गया था ताकि आमेर में आपातकाल या घेराबंदी के दौरान शाही परिवार सुरक्षित रूप से जयगढ़ के मजबूत सैन्य किले में जा सके।"
})

# Q19 (AR, Correct B)
mcqs.append({
    "question_en": "Assertion (A): Jaisalmer Fort is also popularly referred to as 'Sonar Qila' or the Golden Fort.\nReason (R): The fort is designated as a UNESCO World Heritage Site along with five other hill forts of Rajasthan.",
    "question_hi": "कथन (A): जैसलमेर किले को लोकप्रिय रूप से 'सोनार किला' या स्वर्ण किले के रूप में भी जाना जाता है।\nकारण (R): इस किले को राजस्थान के पांच अन्य पहाड़ी किलों के साथ यूनेस्को विश्व धरोहर स्थल के रूप में नामित किया गया है।",
    "options_en": {
        "A": "Both A and R are true, and R is the correct explanation of A",
        "B": "Both A and R are true, but R is NOT the correct explanation of A",
        "C": "A is true, but R is false",
        "D": "A is false, but R is true"
    },
    "options_hi": {
        "A": "A और R दोनों सही हैं, और R, A की सही व्याख्या है",
        "B": "A और R दोनों सही हैं, किन्तु R, A की सही व्याख्या नहीं है",
        "C": "A सही है, किन्तु R गलत है",
        "D": "A गलत है, किन्तु R सही है"
    },
    "correct_option": "B",
    "explanation_en": "Jaisalmer Fort is indeed called Sonar Qila because its yellow sandstone ramparts gleam like gold under sunlight. It was also designated a UNESCO World Heritage Site in 2013 as part of the Hill Forts of Rajasthan. Both statements are true, but the UNESCO designation is not the reason why it is called Sonar Qila.",
    "explanation_hi": "जैसलमेर किले को वास्तव में सोनार किला कहा जाता है क्योंकि इसकी पीली बलुआ पत्थर की प्राचीर धूप में सोने की तरह चमकती है। इसे 2013 में राजस्थान के पहाड़ी किलों के हिस्से के रूप में यूनेस्को विश्व धरोहर स्थल भी घोषित किया गया था। दोनों कथन सत्य हैं, लेकिन यूनेस्को पदनाम इसे सोनार किला कहे जाने का कारण नहीं है।"
})

# Q20 (AR, Correct C)
mcqs.append({
    "question_en": "Assertion (A): The Lohagarh Fort of Bharatpur could never be captured by the British forces despite multiple siege attempts.\nReason (R): The fort was constructed on a high mountain ridge, making it physically impossible for British artillery to reach the ramparts.",
    "question_hi": "कथन (A): भरतपुर के लोहागढ़ किले को कई घेराबंदी के प्रयासों के बावजूद ब्रिटिश सेना कभी नहीं जीत सकी।\nकारण (R): इस किले का निर्माण एक ऊंचे पर्वत शिखर पर किया गया था, जिससे ब्रिटिश तोपखाने के लिए परकोटे तक पहुँचना भौतिक रूप से असंभव हो गया था।",
    "options_en": {
        "A": "Both A and R are true, and R is the correct explanation of A",
        "B": "Both A and R are true, but R is NOT the correct explanation of A",
        "C": "A is true, but R is false",
        "D": "A is false, but R is true"
    },
    "options_hi": {
        "A": "A और R दोनों सही हैं, और R, A की सही व्याख्या है",
        "B": "A और R दोनों सही हैं, किन्तु R, A की सही व्याख्या नहीं है",
        "C": "A सही है, किन्तु R गलत है",
        "D": "A गलत है, किन्तु R सही है"
    },
    "correct_option": "C",
    "explanation_en": "Lohagarh Fort is an iron fort built in the plains (a mud fort/land fort) surrounded by three moats, not on a mountain ridge. Despite this, its unique mud wall design absorbed cannonballs, making it invincible against the British. Thus, Assertion is true but Reason is false.",
    "explanation_hi": "लोहागढ़ किला मैदानी इलाके में बना एक मिट्टी का किला (भूमि दुर्ग) है जो तीन खाइयों से घिरा है, न कि किसी पर्वत श्रृंखला पर। इसके बावजूद, इसके अनूठे मिट्टी की दीवारों के डिजाइन ने तोप के गोलों को सोख लिया, जिससे यह अंग्रेजों के खिलाफ अजेय रहा। इस प्रकार, कथन सही है लेकिन कारण गलत है।"
})

# Q21 (AR, Correct D)
mcqs.append({
    "question_en": "Assertion (A): Junagarh Fort in Bikaner was frequently captured and sacked by Mughal forces due to its vulnerable low-lying location.\nReason (R): Junagarh Fort was built under the patronage of Raja Rai Singh in 1589 AD and contains 37 internal palaces.",
    "question_hi": "कथन (A): बीकानेर का जूनागढ़ किला अपनी संवेदनशील निचली स्थिति के कारण मुगल सेना द्वारा बार-बार जीता और लूटा गया था।\nकारण (R): जूनागढ़ किले का निर्माण 1589 ईस्वी में राजा राय सिंह के संरक्षण में किया गया था और इसमें 37 आंतरिक महल हैं।",
    "options_en": {
        "A": "Both A and R are true, and R is the correct explanation of A",
        "B": "Both A and R are true, but R is NOT the correct explanation of A",
        "C": "A is true, but R is false",
        "D": "A is false, but R is true"
    },
    "options_hi": {
        "A": "A और R दोनों सही हैं, और R, A की सही व्याख्या है",
        "B": "A और R दोनों सही हैं, किन्तु R, A की सही व्याख्या नहीं है",
        "C": "A सही है, किन्तु R गलत है",
        "D": "A गलत है, किन्तु R सही है"
    },
    "correct_option": "D",
    "explanation_en": "Junagarh Fort is famous as the only fort in India that was never captured or sacked by external forces. Thus, the Assertion is false. The Reason is true, as the fort was indeed built by Rai Singh in 1589 AD and houses 37 internal palaces.",
    "explanation_hi": "जूनागढ़ किला भारत के एकमात्र ऐसे किले के रूप में प्रसिद्ध है जिसे बाहरी सेनाओं द्वारा कभी भी जीता या लूटा नहीं गया था। अतः कथन (A) गलत है। कारण (R) सही है, क्योंकि यह किला वास्तव में 1589 ईस्वी में राय सिंह द्वारा बनाया गया था और इसमें 37 आंतरिक महल हैं।"
})

# Q22 (Match, Correct A)
mcqs.append({
    "question_en": "Match the following forts of Rajasthan with their founders or key historical renovators:\n| Column I (Fort) | Column II (Founder/Renovator) |\n|---|---|\n| 1. Mehrangarh | a. Rao Jodha |\n| 2. Junagarh | b. Rai Singh |\n| 3. Nahargarh | c. Sawai Jai Singh II |\n| 4. Achalgarh | d. Maharana Kumbha |\nSelect the correct answer using the codes given below:",
    "question_hi": "राजस्थान के निम्नलिखित किलों को उनके संस्थापकों या प्रमुख ऐतिहासिक जीर्णोद्धारकर्ताओं से सुमेलित कीजिए:\n| कॉलम I (किला) | कॉलम II (संस्थापक/जीर्णोद्धारकर्ता) |\n|---|---|\n| 1. मेहरानगढ़ | a. राव जोधा |\n| 2. जूनागढ़ | b. राय सिंह |\n| 3. नाहरगढ़ | c. सवाई जय सिंह द्वितीय |\n| 4. अचलगढ़ | d. महाराणा कुंभा |\nनीचे दिए गए कूट का उपयोग करके सही उत्तर का चयन कीजिए:",
    "options_en": {
        "A": "1-a, 2-b, 3-c, 4-d",
        "B": "1-b, 2-a, 3-d, 4-c",
        "C": "1-c, 2-d, 3-a, 4-b",
        "D": "1-d, 2-c, 3-b, 4-a"
    },
    "options_hi": {
        "A": "1-a, 2-b, 3-c, 4-d",
        "B": "1-b, 2-a, 3-d, 4-c",
        "C": "1-c, 2-d, 3-a, 4-b",
        "D": "1-d, 2-c, 3-b, 4-a"
    },
    "correct_option": "A",
    "explanation_en": "Mehrangarh Fort was built by Rao Jodha in 1459 AD. Junagarh Fort was built by Raja Rai Singh in 1589 AD. Nahargarh Fort was built by Sawai Jai Singh II in 1734 AD. Achalgarh Fort was renovated and fortified by Maharana Kumbha.",
    "explanation_hi": "मेहरानगढ़ किले का निर्माण 1459 ईस्वी में राव जोधा द्वारा किया गया था। जूनागढ़ किले का निर्माण राजा राय सिंह द्वारा 1589 ईस्वी में किया गया था। नाहरगढ़ किले का निर्माण सवाई जय सिंह II द्वारा 1734 ईस्वी में किया गया था। अचलगढ़ किले का जीर्णोद्धार और सुदृढ़ीकरण महाराणा कुंभा द्वारा किया गया था।"
})

# Q23 (Match, Correct B)
mcqs.append({
    "question_en": "Match the following prominent forts of Rajasthan with their defensive features or identifiers:\n| Column I (Fort) | Column II (Feature/Identifier) |\n|---|---|\n| 1. Gagron Fort | a. Living Fort with 3-layered walls |\n| 2. Jaisalmer Fort | b. Surrounded by water on 3 sides |\n| 3. Lohagarh Fort | c. Houses Jaivana wheeled cannon |\n| 4. Jaigarh Fort | d. Protected by three deep moats |\nSelect the correct answer using the codes given below:",
    "question_hi": "राजस्थान के निम्नलिखित प्रमुख किलों को उनकी रक्षात्मक विशेषताओं या पहचानकर्ताओं के साथ सुमेलित कीजिए:\n| कॉलम I (किला) | कॉलम II (विशेषता/पहचानकर्ता) |\n|---|---|\n| 1. गागरोन किला | a. 3-परत वाली दीवारों वाला सजीव (लिविंग) किला |\n| 2. जैसलमेर किला | b. 3 तरफ से पानी से घिरा हुआ |\n| 3. लोहागढ़ किला | c. जयबाण पहियेदार तोप स्थित है |\n| 4. जयगढ़ किला | d. तीन गहरी खाइयों द्वारा संरक्षित |\nनीचे दिए गए कूट का उपयोग करके सही उत्तर का चयन कीजिए:",
    "options_en": {
        "A": "1-a, 2-b, 3-c, 4-d",
        "B": "1-b, 2-a, 3-d, 4-c",
        "C": "1-c, 2-d, 3-a, 4-b",
        "D": "1-d, 2-c, 3-b, 4-a"
    },
    "options_hi": {
        "A": "1-a, 2-b, 3-c, 4-d",
        "B": "1-b, 2-a, 3-d, 4-c",
        "C": "1-c, 2-d, 3-a, 4-b",
        "D": "1-d, 2-c, 3-b, 4-a"
    },
    "correct_option": "B",
    "explanation_en": "Gagron Fort is surrounded by water on 3 sides (confluence of Ahu and Kali Sindh). Jaisalmer Fort is a living fort with a 3-layered wall system. Lohagarh Fort in Bharatpur is protected by three deep moats. Jaigarh Fort houses the world's largest wheeled cannon (Jaivana).",
    "explanation_hi": "गागरोन किला 3 तरफ से पानी से घिरा हुआ है (आहू और काली सिंध का संगम)। जैसलमेर किला एक सजीव (लिविंग) किला है जिसमें 3-परत वाली दीवार प्रणाली है। भरतपुर का लोहागढ़ किला तीन गहरी खाइयों से सुरक्षित है। जयगढ़ किले में पहियों पर रखी दुनिया की सबसे बड़ी तोप (जयबाण) है।"
})

# Q24 (Match, Correct C)
mcqs.append({
    "question_en": "Match the following forts with their corresponding hill names or geographical features:\n| Column I (Fort) | Column II (Hill/Geography) |\n|---|---|\n| 1. Mehrangarh Fort | a. Confluence of Ahu and Kali Sindh |\n| 2. Jaisalmer Fort | b. Bhim Laat reservoir |\n| 3. Gagron Fort | c. Chidiyatunk hill |\n| 4. Chittorgarh Fort | d. Trikuta hill |\nSelect the correct answer using the codes given below:",
    "question_hi": "निम्नलिखित किलों को उनके संबंधित पहाड़ी नामों या भौगोलिक विशेषताओं के साथ सुमेलित कीजिए:\n| कॉलम I (किला) | कॉलम II (पहाड़ी/भूगोल) |\n|---|---|\n| 1. मेहरानगढ़ किला | a. आहू और काली सिंध का संगम |\n| 2. जैसलमेर किला | b. भीम लात जलाशय |\n| 3. गागरोन किला | c. चिड़ियाटूँक पहाड़ी |\n| 4. चित्तौड़गढ़ किला | d. त्रिकूट पहाड़ी |\nनीचे दिए गए कूट का उपयोग करके सही उत्तर का चयन कीजिए:",
    "options_en": {
        "A": "1-a, 2-b, 3-c, 4-d",
        "B": "1-b, 2-a, 3-d, 4-c",
        "C": "1-c, 2-d, 3-a, 4-b",
        "D": "1-d, 2-c, 3-b, 4-a"
    },
    "options_hi": {
        "A": "1-a, 2-b, 3-c, 4-d",
        "B": "1-b, 2-a, 3-d, 4-c",
        "C": "1-c, 2-d, 3-a, 4-b",
        "D": "1-d, 2-c, 3-b, 4-a"
    },
    "correct_option": "C",
    "explanation_en": "Mehrangarh Fort is built on Chidiyatunk hill. Jaisalmer Fort is situated on Trikuta hill. Gagron Fort is at the confluence of the Ahu and Kali Sindh rivers. Chittorgarh Fort contains the historic Bhim Laat reservoir.",
    "explanation_hi": "मेहरानगढ़ किला चिड़ियाटूँक पहाड़ी पर बना है। जैसलमेर किला त्रिकूट पहाड़ी पर स्थित है। गागरोन किला आहू और काली सिंध नदियों के संगम पर स्थित है। चित्तौड़गढ़ किले में ऐतिहासिक भीम लात जलाशय स्थित है।"
})

# Q25 (Match, Correct D)
mcqs.append({
    "question_en": "Match the following forts of Rajasthan with their unique historical facts or structures:\n| Column I (Fort) | Column II (Historical Fact/Structure) |\n|---|---|\n| 1. Junagarh Fort | a. Birthplace of Maharana Pratap |\n| 2. Kumbhalgarh Fort | b. 12 identical suites for queens |\n| 3. Nahargarh Fort | c. Miran Shah's tomb |\n| 4. Taragarh Fort (Ajmer) | d. Contains 37 internal palaces |\nSelect the correct answer using the codes given below:",
    "question_hi": "राजस्थान के निम्नलिखित किलों को उनके अद्वितीय ऐतिहासिक तथ्यों या संरचनाओं के साथ सुमेलित कीजिए:\n| कॉलम I (किला) | कॉलम II (ऐतिहासिक तथ्य/संरचना) |\n|---|---|\n| 1. जूनागढ़ किला | a. महाराणा प्रताप का जन्मस्थान |\n| 2. कुंभलगढ़ किला | b. रानियों के लिए 12 एक जैसे सुइट्स |\n| 3. नाहरगढ़ किला | c. मीरान शाह की मजार |\n| 4. तारागढ़ किला (अजमेर) | d. इसमें 37 आंतरिक महल हैं |\nनीचे दिए गए कूट का उपयोग करके सही उत्तर का चयन कीजिए:",
    "options_en": {
        "A": "1-a, 2-b, 3-c, 4-d",
        "B": "1-b, 2-c, 3-d, 4-a",
        "C": "1-c, 2-d, 3-a, 4-b",
        "D": "1-d, 2-a, 3-b, 4-c"
    },
    "options_hi": {
        "A": "1-a, 2-b, 3-c, 4-d",
        "B": "1-b, 2-c, 3-d, 4-a",
        "C": "1-c, 2-d, 3-a, 4-b",
        "D": "1-d, 2-a, 3-b, 4-c"
    },
    "correct_option": "D",
    "explanation_en": "Junagarh Fort contains 37 internal palaces. Kumbhalgarh Fort is the birthplace of Maharana Pratap. Nahargarh Fort has 12 identical suites built for queens. Taragarh Fort of Ajmer houses Miran Shah's tomb.",
    "explanation_hi": "जूनागढ़ किले में 37 आंतरिक महल हैं। कुंभलगढ़ किला महाराणा प्रताप का जन्मस्थान है। नाहरगढ़ किले में रानियों के लिए बने 12 एक जैसे सुइट्स हैं। अजमेर के तारागढ़ किले में मीरान शाह की मजार स्थित है।"
})

output_data = {"mcqs": mcqs}

# Write to file
target_path = r"C:\Users\aNKIT\.gemini\antigravity\scratch\rpsc-ras-app\backend\database\generated\pre_mcqs_2147_batch2.json"
os.makedirs(os.path.dirname(target_path), exist_ok=True)
with open(target_path, "w", encoding="utf-8") as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print("SUCCESS")
