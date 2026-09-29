"""Load individually authored restorations; never copy machine-translated bodies.

An adaptation is an editorial checklist, not an assertion that an organisation
endorsed this exact card. References provide the applicable rule or next route.
"""

DATE = '2026-09-29'

def restore(root, entries, sources, original):
    def source(key, title, url):
        sources[key] = {'title': title, 'url': url, 'checkedAt': DATE}
    source('legalhelp', 'Минюст: бесплатная юридическая помощь', 'https://minjust.gov.ru/ru/pages/besplatnaya-yuridicheskaya-pomosh/')
    source('civil', 'Гражданский кодекс РФ — текст в КонсультантПлюс', 'https://www.consultant.ru/document/cons_doc_LAW_5142/')
    source('criminal', 'Уголовный кодекс РФ — текст в КонсультантПлюс', 'https://www.consultant.ru/document/cons_doc_LAW_10699/')
    source('workcode', 'Трудовой кодекс РФ — текст в КонсультантПлюс', 'https://www.consultant.ru/document/cons_doc_LAW_34683/')
    source('familycode', 'Семейный кодекс РФ — текст в КонсультантПлюс', 'https://www.consultant.ru/document/cons_doc_LAW_8982/')
    source('registration', 'ФНС: регистрация бизнеса', 'https://www.nalog.gov.ru/create_business/ip/creation/registration/')
    source('company', 'ФНС: регистрация юридического лица и проверка реестров', 'https://www.nalog.gov.ru/rn77/yul/interest/reg_yl/')
    source('rehab', 'СФР: технические средства реабилитации и ИПРА', 'https://sfr.gov.ru/branches/kchr/info/~2026/07/29/8801?info_category=1')
    source('consulate', 'МИД: советы российским гражданам перед поездкой', 'https://www.kdmid.ru/info-for-traveling-abroad/useful-tips-for-russian-citizens-traveling-abroad/')
    source('drone', 'Москва: памятка об ограничениях запуска дронов', 'https://www.mos.ru/upload/documents/files/9159/pamyatkadroni.pdf')
    source('stroke', 'NHS: признаки инсульта (англ.; в России звоните 103)', 'https://www.nhs.uk/conditions/stroke/symptoms/')
    source('burns', 'NHS: ожоги (англ.; экстренные номера относятся к Великобритании)', 'https://www.nhs.uk/conditions/burns-and-scalds/')
    source('poisoning', 'NHS: отравления (англ.; в России звоните 103)', 'https://www.nhs.uk/conditions/poisoning/')
    source('rabies', 'NHS: бешенство и помощь после контакта (англ.)', 'https://www.nhs.uk/conditions/rabies/')
    source('hiv', 'NHS: ВИЧ, тестирование и срочная профилактика (англ.)', 'https://www.nhs.uk/conditions/hiv-and-aids/')
    source('sids', 'NHS: безопасный сон младенца (англ.)', 'https://www.nhs.uk/baby/caring-for-a-newborn/sudden-infant-death-syndrome-sids/')
    source('folate', 'NHS: витамины при беременности (англ.)', 'https://www.nhs.uk/pregnancy/keeping-well/pregnancy-vitamins-and-supplements/')
    source('alcohol', 'NHS: расстройство, связанное с алкоголем (англ.)', 'https://www.nhs.uk/conditions/alcohol-use-disorder/')
    source('vaccines', 'Роспотребнадзор: национальный календарь и вакцинация', 'https://06.rospotrebnadzor.ru/node/11601')
    source('ukhealth', 'GOV.UK: медицинский сбор при иммиграционном заявлении (англ.)', 'https://www.gov.uk/healthcare-immigration-application')
    source('australia', 'Home Affairs: условия студенческой визы Австралии (англ.)', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500')
    first_aid = {
        'cpr': ('Сердечно-лёгочная реанимация', 'cpr'),
        'bleeding': ('Сильное кровотечение', 'severe-bleeding'),
        'anaphylaxis': ('Анафилаксия', 'anaphylaxis'),
        'diabetes': ('Неотложные состояния при диабете', 'diabetes'),
        'electric': ('Поражение электрическим током', 'electrocution'),
        'heat': ('Тепловой удар', 'heatstroke'),
        'fracture': ('Переломы', 'fractures-and-broken-bones'),
        'head': ('Травма головы', 'head-injury'),
    }
    for key, (title, path) in first_aid.items():
        source(key, 'St John Ambulance: ' + title + ' (англ.; в России звоните 112/103)',
               'https://www.sja.org.uk/first-aid-advice/' + path + '/')
    titles = dict(line.split('|', 1) for line in (root/'tools/titles.ru.txt').read_text().splitlines() if line)
    overrides = dict(line.split('|', 1) for line in (root/'content/title_overrides.tsv').read_text().splitlines() if line)
    assert set(overrides) <= set(original)
    titles.update(overrides)
    # Background references are intentionally distinguished from direct endorsement.
    section_refs = {
        '7': 'legalhelp', '8': 'civil legalhelp', '9': 'criminal',
        '11': 'legalhelp', '12': 'registration company', '13': 'ambulance emergency',
        '15': 'civil', '19': 'workcode labor', '21': 'consulate',
        '24': 'oms rights', '25': 'legalhelp', '26': 'legalhelp',
        '31': 'legalhelp', '32': 'consulate', '33': 'rehab',
    }
    individual = {
        '1-2':'road', '1-4':'gas', '1-5':'poisoning', '1-9':'road', '1-10':'road',
        '1-13':'activity', '1-14':'vaccines', '1-15':'vaccines',
        '1-17':'screen', '1-18':'screen', '1-19':'screen', '1-20':'vaccines',
        '1-30':'hiv', '1-31':'hiv', '1-32':'psych ambulance', '1-33':'poisoning',
        '1-34':'ambulance', '1-35':'criminal legalhelp', '1-36':'emergency',
        '2-2':'tobacco', '2-3':'tobacco', '2-4':'tobacco', '2-5':'tobacco', '2-6':'tobacco',
        '2-13':'sleep', '2-14':'activity', '2-15':'activity', '2-16':'activity', '2-17':'activity',
        '2-20':'alcohol', '2-21':'alcohol ambulance', '2-22':'alcohol',
        '2-38':'sleep', '2-39':'sleep', '2-40':'sleep',
        '3-2':'sleep', '3-3':'sleep', '3-4':'sleep', '3-8':'sleep', '3-13':'workcode',
        '3-15':'psych', '3-19':'psych', '3-25':'psych',
        '5-3':'legalhelp', '5-6':'fraud', '5-9':'civil', '5-13':'oms',
        '5-22':'civil', '5-31':'returns', '5-34':'civil',
        '6-7':'screen', '6-19':'screen',
        '7-1':'job', '7-2':'labor workcode', '7-5':'job', '7-8':'rehab', '7-9':'oms',
        '7-10':'oms', '7-12':'job', '7-13':'job',
        '8-1':'emergency', '8-3':'fraud', '8-4':'call', '8-7':'road', '8-8':'fraud',
        '8-14':'psych emergency', '8-15':'psych emergency', '8-24':'familycode civil',
        '8-25':'familycode civil', '8-26':'familycode', '8-31':'criminal',
        '8-32':'fraud criminal', '8-40':'criminal', '8-43':'legalhelp emergency',
        '9-5':'fraud', '9-11':'drone',
        '10-10':'familycode', '10-11':'civil familycode', '10-12':'familycode',
        '10-13':'familycode', '10-16':'familycode',
        '11-6':'workcode', '11-7':'workcode', '11-12':'workcode legalhelp',
        '12-2':'civil', '12-15':'civil', '12-16':'workcode', '12-17':'workcode',
        '13-1':'cpr emergency', '13-2':'head emergency', '13-10':'head ambulance',
        '13-12':'bleeding emergency', '13-15':'anaphylaxis ambulance', '13-17':'diabetes ambulance',
        '13-18':'electric emergency', '13-22':'heat ambulance', '13-40':'bleeding emergency',
        '13-41':'fracture emergency', '13-3':'stroke ambulance', '13-4':'stroke ambulance', '13-5':'stroke ambulance',
        '13-9':'stroke ambulance', '13-13':'rabies', '13-14':'burns',
        '13-19':'poisoning emergency', '13-20':'poisoning ambulance', '13-21':'burns ambulance',
        '13-38':'hiv', '13-39':'civil legalhelp',
        '14-3':'passwords', '14-4':'stolen', '14-5':'stolen', '14-8':'legalhelp', '14-9':'legalhelp',
        '16-2':'oms rights', '16-6':'oms', '17-1':'civil legalhelp', '17-2':'civil legalhelp',
        '17-5':'fraud', '17-6':'fraud civil', '18-2':'workcode benefit', '18-3':'workcode',
        '19-13':'ambulance', '19-14':'workcode labor',
        '20-1':'sids', '20-2':'vaccines', '20-3':'vaccines',
        '21-6':'consulate', '22-7':'activity', '22-8':'psych',
        '23-1':'workcode', '23-9':'job',
        '27-1':'folate', '27-2':'oms', '27-4':'tobacco alcohol', '27-7':'ambulance',
        '27-8':'ambulance', '27-11':'oms', '27-14':'oms',
        '28-2':'rights', '29-11':'psych', '29-13':'psych legalhelp',
        '30-1':'ambulance', '30-8':'psych', '31-11':'npd', '31-15':'npd legalhelp',
        '32-7':'australia', '32-8':'ukhealth',
        '33-1':'ambulance', '33-3':'legalhelp', '33-18':'civil', '33-19':'civil', '33-20':'legalhelp',
    }
    regional_sections = {'7','8','9','11','12','15','19','21','24','25','26','31','32'}
    regional_ids = {'5-3','5-9','5-13','5-20','5-26','5-31','5-32','5-34',
                    '10-10','10-11','10-12','10-13','10-16','14-8','14-9','16-2',
                    '17-1','17-2','17-7','18-2','18-3','20-2','20-3','23-1','23-9',
                    '27-2','27-11','27-12','27-14','27-15','30-3','30-11',
                    '33-3','33-7','33-8','33-9','33-10','33-11','33-12','33-13','33-14','33-15','33-18','33-19','33-20'}
    moscow_ids = {'7-5','7-21','9-11','22-11','29-11'}
    existing = {e['id'] for e in entries}
    seen = set()
    for line in (root/'content/restored.tsv').read_text().splitlines():
        if not line or line.startswith('#'): continue
        id, summary, steps = line.split('|')
        assert id not in seen and id in original, id
        seen.add(id)
        if id in existing: continue  # Keep the already published, source-specific edition.
        section = id.split('-')[0]
        region = 'moscow' if id in moscow_ids else 'russia' if section in regional_sections or id in regional_ids else 'general'
        refs = individual.get(id, section_refs.get(section, '')).split()
        entries.append(dict(id=id, section=section, title=titles[id], summary=summary,
                            steps=steps, notes='', region=region, basis='adaptation',
                            reviewedAt=DATE, references=[sources[k] for k in refs],
                            referenceContext='Справочные материалы и службы для уточнения. Текст карточки — самостоятельная редакционная адаптация.',
                            status='published', path=original[id]['path']))
    assert set(original) <= {e['id'] for e in entries}, 'A source card was lost'
    assert len(entries) == 619
