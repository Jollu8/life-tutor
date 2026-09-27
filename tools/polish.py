"""Apply editorial Russian titles and section labels after machine translation."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'assets/advice.ru.json'
data=json.loads(p.read_text())
original={e['id']:e for e in json.loads((root/'assets/advice.json').read_text())['entries']}
titles=dict(line.split('|',1) for line in (root/'tools/titles.ru.txt').read_text().splitlines() if line)
assert set(titles)=={e['id'] for e in data['entries']}
sections=['Безопасность и профилактика','Здоровые привычки','Энергия и внимание','Время и дела','Деньги и покупки','На что не стоит тратиться','Поддержка в трудные времена','Права и защита имущества','Правовые ограничения в Китае','Отношения и брак','Технологии и закон','Своё дело','Экстренные ситуации','Цифровая безопасность','Аренда и жильё','Жизнь с хронической болезнью','Забота о старших','Родительство и расходы','Работа и трудовые права','Забота о младенце','Поездки и жизнь за границей','Отдых и общение','Навыки и образование','Медицинская помощь','После утраты близкого','Сайты и платформы в Китае','Беременность и роды','Внешность и здоровье','После тяжёлых событий','Дети школьного возраста','Пути после совершеннолетия','Учёба за границей','Жизнь с инвалидностью']
for s,title in zip(data['sections'],sections):s['title']=title
for e in data['entries']:
 e['title']=titles[e['id']]
 e['evidence']=original[e['id']]['evidence'][0]+e.get('evidence','')[1:]
# Editorial checks for the introductory cards; the full text remains explicitly labelled machine translation.
intro={
'1-1':('Пристёгнутый ремень примерно вдвое снижает риск смертельной травмы у пассажиров переднего ряда при аварии. Ремни нужны и на задних сиденьях.','Бесплатно. Пара секунд перед поездкой.'),
'1-2':('Правильно надетый и застёгнутый шлем снижает риск тяжёлой травмы головы. Используйте его при каждой поездке.','Покупка подходящего шлема и несколько секунд, чтобы застегнуть его.'),
'1-3':('Датчик дыма помогает вовремя заметить пожар. При использовании топлива для отопления нужен и датчик угарного газа: этот газ нельзя заметить по запаху.','Покупка, установка и регулярная проверка датчиков.'),
'1-4':('Следите за сроком службы газовых приборов и шлангов. Ремонт и изменение трубопровода поручайте специалистам. Не соглашайтесь на навязанные покупки без проверки.','Периодическая проверка и замена оборудования.'),
'1-5':('Народные способы отличить ядовитый гриб от съедобного ненадёжны. Не рискуйте здоровьем ради собранных или купленных с рук диких грибов.','Отказ от сбора и употребления дикорастущих грибов.'),
'1-6':('Зарядка аккумулятора электровелосипеда дома или в подъезде создаёт пожарный риск. Используйте предназначенные для этого безопасные места.','Выбор безопасного места для хранения и зарядки.'),
}
for e in data['entries']:
 if e['id'] in intro:e['summary'],e['cost']=intro[e['id']]
data['translation']['editorial']='Russian section labels and card titles reviewed; long-form explanations are unverified machine translations. Introductory summaries adapted.'
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(f"Polished {len(data['entries'])} titles and {len(data['sections'])} topics")
