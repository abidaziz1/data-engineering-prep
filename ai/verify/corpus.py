"""The Brewline document set for the AI course: twelve small documents in five formats, and 24 questions with known answers.

Everything here is made up, on purpose. The documents hold ten kinds of facts (policies, supplier terms, prices, a runbook), a few near duplicates
(an old and a new version of the store handbook), a table in a PDF and in an HTML page, a scanned page with no text layer, and meeting notes with
personal data. The questions were written so that some of them share words with their answer, some only mean the same thing, and some ask for
a code or a number. The recording measures real tools on this set. It says how the mechanics behave, not how a model scores on your data.

build(folder) writes the files. FACTS and QUESTIONS are the ground truth: a chunk is relevant to a question when it holds the key phrase of
the fact that answers it, in a document that is current.
"""
import datetime
import json
import pathlib

# ----------------------------------------------------------------------------------------------------------------------------------------
# Documents: id -> (file name, format, audience, version, current?, title)
# ----------------------------------------------------------------------------------------------------------------------------------------
DOCS = [
    ('handbook-v2', 'store-handbook-v2.pdf', 'pdf', 'managers', 2, True, 'Store handbook v2'),
    ('handbook-v1', 'store-handbook-v1.pdf', 'pdf', 'managers', 1, False, 'Store handbook v1'),
    ('suppliers', 'supplier-terms.pdf', 'pdf', 'finance', 3, True, 'Supplier terms'),
    ('equipment', 'equipment-care.pdf', 'pdf', 'managers', 1, True, 'Equipment care'),
    ('leave', 'leave-policy.docx', 'docx', 'hr', 4, True, 'Leave policy'),
    ('menu', 'menu-and-allergens.html', 'html', 'all-staff', 5, True, 'Menu and allergens'),
    ('faq', 'customer-faq.md', 'md', 'all-staff', 2, True, 'Customer FAQ'),
    ('loyalty', 'loyalty-program.md', 'md', 'all-staff', 1, True, 'Loyalty program'),
    ('runbook', 'incident-runbook.md', 'md', 'managers', 2, True, 'Incident runbook'),
    ('prices', 'price-list-2026.md', 'md', 'finance', 1, True, 'Price list 2026'),
    ('glossary', 'glossary.md', 'md', 'all-staff', 1, True, 'Glossary'),
    ('notes', 'meeting-notes-2026-03.txt', 'txt', 'managers', 1, True, 'Meeting notes, March 2026'),
]
ROLES = {'staff': ['all-staff'], 'manager': ['all-staff', 'managers'], 'finance': ['all-staff', 'finance'], 'hr': ['all-staff', 'hr']}

# ----------------------------------------------------------------------------------------------------------------------------------------
# Facts: id -> (doc, section, sentence, key phrase)
# ----------------------------------------------------------------------------------------------------------------------------------------
FACTS = {
    'f01': ('handbook-v2', 'Refunds and returns', 'A customer may return an unused drink voucher or a sealed bag of beans within 14 days of purchase with a receipt.', 'within 14 days of purchase'),
    'f01_old': ('handbook-v1', 'Refunds and returns', 'A customer may return an unused drink voucher or a sealed bag of beans within 30 days of purchase with a receipt.', 'within 30 days of purchase'),
    'f02': ('handbook-v2', 'Refunds and returns', 'A refund above EUR 50 needs a second manager to approve it in the till.', 'above EUR 50'),
    'f02_old': ('handbook-v1', 'Refunds and returns', 'A refund above EUR 100 needs a second manager to approve it in the till.', 'above EUR 100'),
    'f03': ('handbook-v2', 'Allergens', 'Staff must tell every customer who asks about nuts that the almond syrup and the pistachio topping contain tree nuts.', 'almond syrup and the pistachio topping'),
    'f04': ('handbook-v2', 'Cash handling', 'The cash drawer is counted twice a day, at 14:00 and at close, by two people.', 'counted twice a day'),
    'f05': ('handbook-v2', 'Opening', 'The first person to arrive switches on the espresso machines 30 minutes before opening so that they reach brewing temperature.', '30 minutes before opening'),
    'f06': ('handbook-v2', 'Cleaning', 'The steam wands are purged and wiped after every use and descaled every Sunday night.', 'descaled every Sunday night'),
    'f07': ('handbook-v2', 'Incidents', 'Any injury must be written in the incident log within 24 hours and reported to the area manager the same day.', 'written in the incident log within 24 hours'),
    'f08': ('handbook-v2', 'Cold chain', 'Milk must be stored at 5 degrees Celsius or lower, and the fridge temperature is logged at open and close.', '5 degrees Celsius or lower'),
    'f09': ('handbook-v2', 'Tips', 'Card tips are paid out with the monthly salary, and cash tips are shared at the end of each week.', 'shared at the end of each week'),
    'f10': ('handbook-v2', 'Closing', 'The last person to leave sets the alarm and photographs the locked back door for the closing report.', 'photographs the locked back door'),
    's01': ('suppliers', 'Andes Roasters', 'Andes Roasters delivers beans every Tuesday and Friday with a lead time of 3 days and a minimum order of 40 kg.', 'minimum order of 40 kg'),
    's02': ('suppliers', 'Andes Roasters', 'A late delivery from Andes Roasters carries a penalty of 2 percent of the invoice for each day, capped at 10 percent.', 'penalty of 2 percent'),
    's03': ('suppliers', 'Hillside Dairy', 'Hillside Dairy delivers milk every day before 06:00, and a missed delivery must be reported before 08:00 to claim a credit.', 'reported before 08:00'),
    'h01': ('leave', 'Annual leave', 'Employees receive 25 days of paid leave a year, and leave must be requested at least 14 days ahead.', '25 days of paid leave'),
    'h02': ('leave', 'Sick leave', 'Sick leave needs a doctor\'s note from the third consecutive day of absence.', 'third consecutive day'),
    'h03': ('leave', 'Parental leave', 'Parental leave is 16 weeks at full pay for the primary carer.', '16 weeks at full pay'),
    'm01': ('menu', 'Allergens', 'The pistachio cold brew contains tree nuts and is made on shared equipment.', 'pistachio cold brew contains tree nuts'),
    'q01': ('faq', 'Points', 'Loyalty points expire 12 months after they are earned.', 'expire 12 months after'),
    'q02': ('faq', 'Gift cards', 'A gift card never expires and can be used in any store.', 'never expires'),
    'q03': ('faq', 'Cold orders', 'If an order arrives cold, the customer gets a replacement drink or the money back.', 'the money back'),
    'l01': ('loyalty', 'Gold', 'Gold status starts at 500 points in a year and gives a free drink every month.', 'Gold status starts at 500 points'),
    'e01': ('equipment', 'Grinders', 'Grinders are recalibrated every 14 days, or after a bag change if the shot time drifts by more than 3 seconds.', 'drifts by more than 3 seconds'),
    'e02': ('equipment', 'Descaling', 'Descaling an espresso machine takes 45 minutes and uses the Brewline descaler, product code BD-220.', 'product code BD-220'),
    'r01': ('runbook', 'Power cut', 'If the power fails for more than 2 hours, discard all milk and open dairy and call the area manager.', 'more than 2 hours'),
    'r02': ('runbook', 'Fire alarm', 'In a fire alarm, evacuate through the front door and meet at the assembly point by the bus stop.', 'assembly point by the bus stop'),
    'p01': ('prices', 'Drinks', 'A large latte costs EUR 4.60 and a large oat flat white costs EUR 4.90.', 'EUR 4.90'),
    'n01': ('notes', 'Decisions', 'Decision: raise the milk alternative surcharge from EUR 0.40 to EUR 0.50 from 1 May.', 'from EUR 0.40 to EUR 0.50'),
}

# 24 questions: kind says why the question is hard for one kind of search. gold is the fact that answers it.
QUESTIONS = [
    ('q01', 'How many days do customers have to return a bag of beans?', 'f01', 'words'),
    ('q02', 'When must an injury be written in the incident log?', 'f07', 'words'),
    ('q03', 'What is the product code of the descaler?', 'e02', 'code'),
    ('q04', 'What is the minimum order for Andes Roasters?', 's01', 'words'),
    ('q05', 'How many weeks of parental leave are paid at full pay?', 'h03', 'words'),
    ('q06', 'What temperature must milk be stored at?', 'f08', 'words'),
    ('q07', 'When does Hillside Dairy deliver milk, and by when must a missed delivery be reported?', 's03', 'words'),
    ('q08', 'How long does descaling the espresso machine take?', 'e02', 'words'),
    ('q09', 'Can a shopper get reimbursed for beans they have not opened?', 'f01', 'meaning'),
    ('q10', 'What should the team do if electricity is cut for a long time?', 'r01', 'meaning'),
    ('q11', 'Is it safe to serve the pistachio drink to someone with a nut allergy?', 'm01', 'meaning'),
    ('q12', 'When do reward points stop being valid?', 'q01', 'meaning'),
    ('q13', 'Are gratuities from card payments paid in cash?', 'f09', 'meaning'),
    ('q14', 'How often must the till money be checked?', 'f04', 'meaning'),
    ('q15', 'How early do we warm up the coffee machines?', 'f05', 'meaning'),
    ('q16', 'What happens when the roaster delivers late?', 's02', 'meaning'),
    ('q17', 'What is the price of a large oat flat white?', 'p01', 'number'),
    ('q18', 'Which drinks contain tree nuts?', 'm01', 'table'),
    ('q19', 'What is the lead time for Andes Roasters?', 's01', 'number'),
    ('q20', 'Above what amount does a refund need a second manager?', 'f02', 'stale'),
    ('q21', 'From which day of sickness is a doctor\'s note needed?', 'h02', 'words'),
    ('q22', 'Where is the assembly point in a fire?', 'r02', 'words'),
    ('q23', 'What was decided about the surcharge for milk alternatives?', 'n01', 'words'),
    ('q24', 'What does Gold status give a customer?', 'l01', 'words'),
]

FILLER = [
    'Please keep the work area tidy and the counters clear.', 'Ask your shift lead if anything in this section is unclear.',
    'New staff read this section in their first week.', 'The area manager reviews these rules once a year.',
    'Write down anything unusual in the shift log.', 'Smile, greet every guest, and keep the queue moving.',
    'Report broken equipment to the maintenance team the same day.', 'Photos of the display shelf are checked on Mondays.',
    'Keep a copy of this page in the back office.', 'Questions about this section go to the operations team.',
    'Lists of store contacts are kept at the till.', 'Training videos for this topic are on the staff portal.',
]

PEOPLE = [('Maria Santos', 'maria.santos@brewline.example', '+31 6 1234 5678'), ('Kenji Mori', 'kenji.mori@brewline.example', '+31 6 8765 4321')]
IBAN = 'NL91ABNA0417164300'

HOURS = [('Store', 'Mon to Fri', 'Sat', 'Sun'), ('Amsterdam Central', '07:00 to 19:00', '08:00 to 18:00', '09:00 to 17:00'), ('Rotterdam Station', '06:30 to 20:00', '08:00 to 19:00', 'closed'),
         ('Utrecht Canal', '07:30 to 18:00', '08:30 to 17:00', '10:00 to 16:00')]
SUPPLIERS = [('Supplier', 'Delivers', 'Lead time', 'Minimum order'), ('Andes Roasters', 'Tue, Fri', '3 days', '40 kg'), ('Hillside Dairy', 'every day', '1 day', '60 litres'), ('Paper Lane', 'Mon', '7 days', '5 boxes')]
DRINKS = [('Drink', 'Contains', 'May contain'), ('Latte', 'milk', 'none'), ('Oat flat white', 'oats', 'gluten'), ('Almond croissant', 'tree nuts, gluten, milk, eggs', 'sesame'),
          ('Pistachio cold brew', 'tree nuts', 'milk'), ('Matcha latte', 'milk', 'none')]


def section_text(doc, which):
    """Sentences of one section: the facts of that section, and a few filler sentences (the same ones every time)."""
    out = []
    for fid, (d, sec, sentence, key) in FACTS.items():
        if d == doc and sec == which:
            out.append(sentence)
    fam = doc.split('-v')[0]                                  # handbook-v1 and handbook-v2 are one family, so they share their filler
    n = (sum(map(ord, fam + which)) % 4) + 2
    fill = [FILLER[(sum(map(ord, fam + which)) + 5 * i) % len(FILLER)] for i in range(n)]
    # put the fact in the middle so that a cut at the start or the end does not hide it
    mid = len(fill) // 2
    return ' '.join(fill[:mid] + out + fill[mid:])


def doc_sections(doc):
    seen, order = set(), []
    for fid, (d, sec, s, k) in FACTS.items():
        if d == doc and sec not in seen:
            seen.add(sec)
            order.append(sec)
    return order


def md_doc(doc, title):
    parts = ['# ' + title, '']
    for sec in doc_sections(doc):
        parts += ['## ' + sec, '', section_text(doc, sec), '']
    return '\n'.join(parts)


BARISTA = [
    ('Espresso', ['The espresso recipe is 18 g of coffee in and 36 g of coffee out in 28 seconds.', 'Tamp with about 15 kg of pressure and level the surface.', 'Rinse the portafilter after every shot.',
                  'Grind finer when a shot runs faster than 25 seconds and coarser when it runs slower than 32 seconds.']),
    ('Milk', ['Steam milk to 65 degrees Celsius and never above 70 degrees.', 'Oat drinks are steamed to 60 degrees Celsius.', 'A flat white uses 160 ml of milk and a large latte uses 300 ml.',
              'Open milk cartons are labelled with the date and used within 3 days.', 'Purge the steam wand before the first drink so that the foam stays smooth.']),
    ('Beans', ['Store opened beans in a sealed container and use them within 14 days.', 'Each bag of beans carries a roast date, and beans older than 6 weeks are used for staff drinks.',
               'A hopper holds about 1 kg of beans and is refilled when it is a quarter full.']),
    ('Latte art', ['Latte art starts with microfoam, a glossy foam without large bubbles.', 'Pour from a height at first and then bring the jug close to the surface.']),
]
STORES = ['Amsterdam Central', 'Rotterdam Station', 'Utrecht Canal', 'Haarlem Market', 'Leiden Gate', 'Delft Square', 'Eindhoven Plaza', 'Groningen Harbour', 'Maastricht Bridge', 'Tilburg Mill',
          'Breda Park', 'Arnhem Hill', 'Nijmegen Quay', 'Zwolle Tower', 'Apeldoorn Green', 'Almere Lake', 'Den Bosch Lane', 'Amersfoort Court', 'Enschede Yard', 'Leeuwarden Dock',
          'Alkmaar Dune', 'Venlo Mill', 'Zaandam Pier', 'Hilversum Wood', 'Dordrecht Lock', 'Gouda Market', 'Roermond Fort', 'Heerlen Tunnel', 'Emmen Pond', 'Deventer Bridge',
          'Hengelo Works', 'Kampen Gate', 'Vlissingen Beach', 'Middelburg Abbey', 'Helmond Castle', 'Oss Garden', 'Veenendaal Ridge', 'Purmerend Dyke', 'Spijkenisse Port', 'Lelystad Wharf']
NAMES = ['Anna', 'Bram', 'Chloe', 'Daan', 'Eva', 'Finn', 'Gwen', 'Hugo', 'Iris', 'Jens', 'Kira', 'Liam', 'Mila', 'Noah', 'Olga', 'Pim', 'Quinn', 'Ruben', 'Sanne', 'Tess']
COLORS = ['red', 'blue', 'green', 'grey', 'yellow', 'black']
DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
MONTHS = ['January', 'March', 'May', 'June', 'September', 'November']
ROLES2 = ['the shift lead', 'the store manager', 'the deputy manager']
BULK = [
    'The cash drawer at {s} sits in the back office safe overnight, and the key is held by {role}.', 'A float of EUR {n} is kept in the {s} till at the start of every shift.',
    'At {s} the card reader is restarted by {role} when it shows a network error.', 'The {s} store has {n} seats inside and {m} seats on the terrace.',
    'Milk at {s} is kept in the {color} fridge, and the door stays shut.', 'The {s} store sells about {n} large drinks on a normal {day}.', 'Grinder number {m} at {s} is the one used for decaf.',
    'The espresso machine at {s} has {m} groups and a {n} litre boiler.', 'Staff at {s} wash their hands after handling cash and before making drinks.',
    'The rota for {s} is published on the staff portal every {day}.', 'The {s} store hosts a customer tasting evening on the first {day} of the month.', 'The alarm panel at {s} is next to the {color} door.',
    'Deliveries to {s} are signed for by the person who opens the store.', 'The loyalty app at {s} is shown on a tablet next to the till.', 'The manager of {s} is {name}, and the deputy is {name2}.',
    'A customer survey card is placed on each table at {s}.', 'The staff room at {s} has a microwave and a small fridge for lunch boxes.', '{s} was refurbished in {year} and now has a longer counter.',
    'The coffee grounds bin at {s} is emptied by the closing team.', 'At {s} the window display is changed on the first {day} of every month.',
    'Seasonal gift boxes at {s} are sold until {month}.', 'The fridge at {s} was replaced in {year} and has a {color} door.', 'The lights at {s} are switched on at {time} by the first person in.',
    'The {s} team meets for {n} minutes on {day} to plan the week.', 'The steam wand at {s} is the one that was serviced in {month}.', 'The {s} store has a bike rack for {n} bikes.',
    'The card tips jar at {s} is the {color} one.', 'New starters at {s} are paired with {name} for their first {n} shifts.', 'The back door at {s} faces the {color} bin store.',
    'The espresso blend at {s} is changed every {n} weeks, and {name} tastes it first.', 'Fire extinguishers at {s} are checked in {month}.', 'The till at {s} shows the loyalty points after each sale.',
    'The oat milk at {s} is delivered in cartons of {n}.', 'Customers at {s} often ask for the wifi password, which is on the {color} card.', 'The incident folder at {s} is kept in the {color} cabinet.',
]


def store_note(i, name):
    import random
    rng = random.Random(1000 + i)
    secs = []
    for k in range(10):
        sents = []
        for _ in range(3):
            t = rng.choice(BULK)
            sents.append(t.format(s=name, role=rng.choice(ROLES2), n=rng.choice([4, 6, 8, 12, 20, 25, 40, 80, 120, 150]), m=rng.choice([2, 3, 4]), color=rng.choice(COLORS), day=rng.choice(DAYS),
                                  name=rng.choice(NAMES), name2=rng.choice(NAMES), year=rng.choice([2019, 2021, 2023, 2024]), month=rng.choice(MONTHS), time='%02d:%02d' % (rng.choice([5, 6, 7]), rng.choice([0, 15, 30]))))
        secs.append(('Section %d' % (k + 1), sents))
    return secs


OTHER = [
    ('onboarding-week-1.md', 'all-staff', 'Onboarding, week one', [('Day one', ['Collect your uniform and your staff card from the area manager.', 'Shadow a barista for the whole shift and learn the till.']),
        ('Day two', ['Learn the espresso recipe and the milk steaming steps.', 'Read the allergen table and ask questions about every drink.']),
        ('Day five', ['Make ten drinks with a trainer watching.', 'Your first review is on Friday afternoon, and your team lead writes a short note.'])]),
    ('safety-training.md', 'managers', 'Safety training', [('Fire drills', ['A fire drill runs twice a year and the shift lead times it.', 'Every store has a fire blanket next to the kitchen sink.']),
        ('First aid', ['The first aid kit is checked on the first Monday of each month.', 'Near misses are noted in the shift log within 48 hours.'])]),
    ('marketing-calendar.md', 'all-staff', 'Marketing calendar', [('Spring', ['The spring menu starts on 1 April with the lavender latte.', 'Gold members get double points in May.']),
        ('Summer', ['Cold brew posters go up in June.', 'The student discount is 10 percent with a valid card.'])]),
    ('delivery-schedule.md', 'finance', 'Delivery schedule', [('Weekly deliveries', ['Paper Lane delivers cups and lids every Monday.', 'Cleaning supplies arrive on the first Thursday of the month.']),
        ('Invoices', ['Invoices are paid within 30 days of receipt.', 'Questions about an invoice go to the finance team.'])]),
    ('recycling-and-waste.md', 'all-staff', 'Recycling and waste', [('Coffee grounds', ['Coffee grounds go into the green bin and are collected every Wednesday.', 'Customers can take a free bag of grounds for their garden.']),
        ('Packaging', ['Cardboard is flattened and tied before it goes out.', 'Milk cartons are rinsed and placed in the blue bin.'])]),
]


def store_note(i, name):
    r = (i * 7) % 5
    return [('Opening', ['The %s store opens at %02d:%02d on weekdays and closes at %02d:00.' % (name, 6 + r % 2, 30 if r % 2 else 0, 18 + r % 3),
                         'The espresso machines in %s are switched on at %02d:%02d.' % (name, 6 + r % 2, 0 if r % 2 else 15)]),
            ('Cash and tips', ['The cash drawer in %s is counted at %02d:30 and at close.' % (name, 13 + r % 3), 'Tips in %s are shared on %s.' % (name, ['Friday', 'Saturday', 'Sunday', 'Monday', 'Thursday'][r])]),
            ('Deliveries', ['Milk arrives at the %s store before %02d:30 each morning.' % (name, 5 + r % 2), 'The back door code in %s is changed every %d days.' % (name, 30 + 10 * r)])]


def extra_docs():
    """(doc_id, file name, audience, title, [(section, [sentences])]) for the documents that hold no answer. They are there to be confusing."""
    out = [('barista-training', 'barista-training.md', 'all-staff', 'Barista training', BARISTA)]
    for fn, aud, title, secs in OTHER:
        out.append((fn.replace('.md', ''), fn, aud, title, secs))
    for i, name in enumerate(STORES):
        out.append(('store-' + name.lower().replace(' ', '-'), 'store-notes-' + name.lower().replace(' ', '-') + '.md', 'all-staff', 'Local notes: ' + name, store_note(i, name)))
    return out


GLOSSARY = '''# Glossary

Words that the staff and the customers use for the same thing.

## Money back
A refund is the same as a return. To reimburse a customer, or to give a shopper the money back, is a refund. A shopper is a customer. Unopened means sealed and unused. Customers also say "money back" or "I want my money returned".

## Vouchers
A voucher is also called a coupon or a ticket. An unused voucher can be returned like a sealed bag of beans.

## Electricity
A power cut, a blackout and an outage all mean that the electricity is off. Staff call it a power failure in the runbook.

## Gratuities
A tip is also called a gratuity. Card tips and cash tips follow different rules.

## Reward points
Loyalty points are the reward points of the app. Points stop being valid on an expiry date.

## Coffee machine
The espresso machine is the coffee machine. Warm-up means switching it on early so that it reaches brewing temperature.

## Till money
The cash drawer holds the till money. Counting it is also called a cash check.

## Roaster
Andes Roasters is the roaster. A roaster delivers beans, and a late delivery is a delivery that arrives after the agreed day.
'''

NOTES_TXT = '''Meeting notes, 12 March 2026
Present: {a}, {b}, and the three store leads.
{a} can be reached at {ea} or {pa}. {b} can be reached at {eb} or {pb}.

Agenda
1. Summer menu. The pistachio cold brew sells well and stays on the menu.
2. Milk prices. {dec}
3. Payroll. The tip payout for February is paid to the account {iban}. Order references such as ORD-2026-0412 and SKU-4471 are not personal data.
4. Next meeting on 9 April. Please keep the area tidy and ask your shift lead if anything is unclear.
'''.format(a=PEOPLE[0][0], b=PEOPLE[1][0], ea=PEOPLE[0][1], pa=PEOPLE[0][2], eb=PEOPLE[1][1], pb=PEOPLE[1][2], dec=FACTS['n01'][2], iban=IBAN)


def html_doc():
    rows = ''.join('<tr>%s</tr>' % ''.join('<%s>%s</%s>' % ('th' if i == 0 else 'td', c, 'th' if i == 0 else 'td') for c in r) for i, r in enumerate(DRINKS))
    return ('<html><head><title>Menu and allergens</title><style>td{padding:2px}</style></head><body>\n<nav>Home | Menu | Stores | Careers</nav>\n<h1>Menu and allergens</h1>\n'
            '<h2>Allergens</h2>\n<p>%s</p>\n<table>%s</table>\n<script>var tracking = true;</script>\n<footer>Brewline 2026. All rights reserved.</footer>\n</body></html>\n'
            % (section_text('menu', 'Allergens'), rows))


def pdf_doc(path, title, doc, header, table=None, table_after=None, pages=None):
    from fpdf import FPDF

    class P(FPDF):
        def header(self):
            self.set_font('Helvetica', 'I', 8)
            self.cell(0, 6, header, align='L')
            self.ln(10)

        def footer(self):
            self.set_y(-14)
            self.set_font('Helvetica', 'I', 8)
            self.cell(0, 6, 'Page %d of {nb}' % self.page_no(), align='C')

    pdf = P()
    pdf.set_creation_date(datetime.datetime(2026, 3, 1))
    pdf.alias_nb_pages('{nb}')
    pdf.set_auto_page_break(True, 18)
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 16)
    pdf.cell(0, 10, title)
    pdf.ln(12)
    for sec in doc_sections(doc):
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, sec)
        pdf.ln(9)
        pdf.set_font('Helvetica', '', 10)
        pdf.multi_cell(0, 5.5, section_text(doc, sec))
        pdf.ln(3)
        if table and table_after == sec:
            pdf.set_font('Helvetica', '', 9)
            with pdf.table(text_align='LEFT') as t:
                for r in table:
                    row = t.row()
                    for c in r:
                        row.cell(c)
            pdf.ln(4)
        if pages and pdf.page_no() < pages and sec != doc_sections(doc)[-1]:
            pdf.add_page()                                   # one section on each page, so that a header and a footer repeat on every page
    pdf.output(str(path))


def scanned_pdf(path):
    """A page that is a picture of text. It has no text layer, so a text extractor finds nothing on it."""
    from PIL import Image, ImageDraw
    from fpdf import FPDF
    img = Image.new('RGB', (600, 160), 'white')
    ImageDraw.Draw(img).text((20, 30), 'Delivery note 2026-03-12: 12 bags of beans, 40 kg, signed by M. Santos', fill='black')
    tmp = pathlib.Path(str(path) + '.png')
    img.save(tmp)
    pdf = FPDF()
    pdf.set_creation_date(datetime.datetime(2026, 3, 1))
    pdf.add_page()
    pdf.image(str(tmp), x=10, y=20, w=180)
    pdf.output(str(path))
    tmp.unlink()


def docx_doc(path, title, doc):
    import docx
    d = docx.Document()
    d.add_heading(title, level=1)
    for sec in doc_sections(doc):
        d.add_heading(sec, level=2)
        d.add_paragraph(section_text(doc, sec))
    t = d.add_table(rows=3, cols=2)
    for i, (a, b) in enumerate([('Leave type', 'Rule'), ('Annual', '25 days, request 14 days ahead'), ('Sick', 'note from day 3')]):
        t.rows[i].cells[0].text, t.rows[i].cells[1].text = a, b
    d.core_properties.created = datetime.datetime(2026, 3, 1)
    d.core_properties.modified = datetime.datetime(2026, 3, 1)
    d.save(str(path))


def build(folder):
    folder = pathlib.Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    for doc_id, name, fmt, aud, ver, cur, title in DOCS:
        p = folder / name
        if doc_id == 'handbook-v2':
            pdf_doc(p, title, 'handbook-v2', 'Brewline Store Handbook v2 - Internal', table=HOURS, table_after='Opening', pages=12)
        elif doc_id == 'handbook-v1':
            pdf_doc(p, title, 'handbook-v1', 'Brewline Store Handbook v1 - Internal', pages=12)
        elif doc_id == 'suppliers':
            pdf_doc(p, title, 'suppliers', 'Brewline Supplier Terms - Finance', table=SUPPLIERS, table_after='Andes Roasters', pages=4)
        elif doc_id == 'equipment':
            pdf_doc(p, title, 'equipment', 'Brewline Equipment Care - Internal', pages=3)
        elif doc_id == 'leave':
            docx_doc(p, title, 'leave')
        elif doc_id == 'menu':
            p.write_text(html_doc())
        elif doc_id == 'glossary':
            p.write_text(GLOSSARY)
        elif doc_id == 'notes':
            p.write_text(NOTES_TXT)
        else:
            p.write_text(md_doc(doc_id, title) + '\n')
    scanned_pdf(folder / 'delivery-note-scan.pdf')
    for doc_id, fname, aud, title, secs in extra_docs():
        body = ['# ' + title, '']
        for sec, sents in secs:
            body += ['## ' + sec, '', ' '.join(sents), '']
        (folder / fname).write_text('\n'.join(body) + '\n')
    return folder


# handbook v1 shares most of its facts with v2, so it gets the same sections from the old facts and the unchanged ones
def _fix_v1():
    for fid, (d, sec, sentence, key) in list(FACTS.items()):
        if d == 'handbook-v2' and fid not in ('f01', 'f02'):
            FACTS[fid + '_v1'] = ('handbook-v1', sec, sentence, key)


_fix_v1()

if __name__ == '__main__':
    import sys
    build(sys.argv[1] if len(sys.argv) > 1 else 'corpus')
    print(json.dumps({'docs': len(DOCS) + 1, 'facts': len(FACTS), 'questions': len(QUESTIONS)}))
