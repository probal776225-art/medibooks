// Sample medicines for the LOCAL emulator only, typed by hand for testing search and pricing.
// Names, companies and prices are illustrative and may not match the market — never import this into the real shop.
// Columns: brand | generic | strength | form | company | piece price ৳ | pieces per strip | pieces per box | pack text
export const SAMPLE_MEDICINES = `
Napa|Paracetamol|500 mg|Tablet|Beximco Pharmaceuticals Ltd.|1.20|10|500|50 x 10
Napa Extra|Paracetamol + Caffeine|500 mg+65 mg|Tablet|Beximco Pharmaceuticals Ltd.|2.50|12|240|20 x 12
Napa Extend|Paracetamol|665 mg|Tablet|Beximco Pharmaceuticals Ltd.|2.00|10|150|15 x 10
Napa|Paracetamol|120 mg/5 ml|Suspension|Beximco Pharmaceuticals Ltd.|35|||60 ml bottle
Napa|Paracetamol|125 mg|Suppository|Beximco Pharmaceuticals Ltd.|7|5|50|10 x 5
Ace|Paracetamol|500 mg|Tablet|Square Pharmaceuticals PLC|1.20|10|500|50 x 10
Ace Plus|Paracetamol + Caffeine|500 mg+65 mg|Tablet|Square Pharmaceuticals PLC|2.50|12|240|20 x 12
Ace|Paracetamol|120 mg/5 ml|Syrup|Square Pharmaceuticals PLC|35|||100 ml bottle
Fast|Paracetamol|500 mg|Tablet|ACME Laboratories Ltd.|1.20|10|200|20 x 10
Renova|Paracetamol|500 mg|Tablet|Opsonin Pharma Ltd.|1.20|10|200|20 x 10
Seclo|Omeprazole|20 mg|Capsule|Square Pharmaceuticals PLC|6|10|100|10 x 10
Seclo|Omeprazole|40 mg|Capsule|Square Pharmaceuticals PLC|9|10|60|6 x 10
Losectil|Omeprazole|20 mg|Capsule|Eskayef Pharmaceuticals Ltd.|6|10|100|10 x 10
Losectil|Omeprazole|40 mg|Capsule|Eskayef Pharmaceuticals Ltd.|9|10|50|5 x 10
Proceptin|Omeprazole|20 mg|Capsule|General Pharmaceuticals Ltd.|5|10|100|10 x 10
Maxpro|Esomeprazole|20 mg|Tablet|Renata PLC|7|10|100|10 x 10
Maxpro|Esomeprazole|40 mg|Tablet|Renata PLC|10|10|60|6 x 10
Sergel|Esomeprazole|20 mg|Capsule|Healthcare Pharmaceuticals Ltd.|7|10|100|10 x 10
Sergel|Esomeprazole|40 mg|Capsule|Healthcare Pharmaceuticals Ltd.|10|10|60|6 x 10
Nexum|Esomeprazole|20 mg|Tablet|Square Pharmaceuticals PLC|7|10|100|10 x 10
Esoral|Esomeprazole|20 mg|Capsule|Eskayef Pharmaceuticals Ltd.|7|10|100|10 x 10
Pantonix|Pantoprazole|20 mg|Tablet|Incepta Pharmaceuticals Ltd.|5|10|100|10 x 10
Pantonix|Pantoprazole|40 mg|Tablet|Incepta Pharmaceuticals Ltd.|7|10|60|6 x 10
Finix|Rabeprazole|20 mg|Tablet|Opsonin Pharma Ltd.|7|10|60|6 x 10
Neoceptin R|Ranitidine|150 mg|Tablet|Beximco Pharmaceuticals Ltd.|2|10|100|10 x 10
Famotack|Famotidine|20 mg|Tablet|Square Pharmaceuticals PLC|1.50|10|100|10 x 10
Antacid Plus|Aluminium Hydroxide + Magnesium Hydroxide + Simethicone||Suspension|Square Pharmaceuticals PLC|90|||200 ml bottle
Flatameal DS|Aluminium Hydroxide + Magnesium Hydroxide + Simethicone||Suspension|Square Pharmaceuticals PLC|100|||200 ml bottle
Motigut|Domperidone|10 mg|Tablet|Square Pharmaceuticals PLC|2|10|100|10 x 10
Omidon|Domperidone|10 mg|Tablet|Beximco Pharmaceuticals Ltd.|2|10|100|10 x 10
Motigut|Domperidone|5 mg/5 ml|Suspension|Square Pharmaceuticals PLC|40|||60 ml bottle
Emistat|Ondansetron|8 mg|Tablet|Square Pharmaceuticals PLC|12|10|30|3 x 10
Onaseron|Ondansetron|8 mg|Tablet|Healthcare Pharmaceuticals Ltd.|12|10|30|3 x 10
Imotil|Loperamide|2 mg|Capsule|Square Pharmaceuticals PLC|2|10|100|10 x 10
ORSaline-N|Oral Rehydration Salts||Sachet|SMC Enterprise Ltd.|6||20|box of 20
Xinc|Zinc Sulfate|20 mg/5 ml|Syrup|Square Pharmaceuticals PLC|45|||100 ml bottle
Avolac|Lactulose|3.35 g/5 ml|Syrup|Aristopharma Ltd.|250|||100 ml bottle
Fexo|Fexofenadine|120 mg|Tablet|Square Pharmaceuticals PLC|8|10|50|5 x 10
Fexo|Fexofenadine|180 mg|Tablet|Square Pharmaceuticals PLC|12|10|30|3 x 10
Fexo|Fexofenadine|30 mg/5 ml|Suspension|Square Pharmaceuticals PLC|80|||50 ml bottle
Fenadin|Fexofenadine|120 mg|Tablet|Renata PLC|8|10|50|5 x 10
Fenadin|Fexofenadine|180 mg|Tablet|Renata PLC|12|10|30|3 x 10
Alatrol|Cetirizine|10 mg|Tablet|Square Pharmaceuticals PLC|3|10|100|10 x 10
Alatrol|Cetirizine|5 mg/5 ml|Syrup|Square Pharmaceuticals PLC|35|||60 ml bottle
Atrizin|Cetirizine|10 mg|Tablet|Opsonin Pharma Ltd.|3|10|100|10 x 10
Histacin|Chlorpheniramine|4 mg|Tablet|Jayson Pharmaceuticals Ltd.|0.50|10|250|25 x 10
Deslor|Desloratadine|5 mg|Tablet|Incepta Pharmaceuticals Ltd.|5|10|50|5 x 10
Rupa|Rupatadine|10 mg|Tablet|Healthcare Pharmaceuticals Ltd.|10|10|30|3 x 10
Monas|Montelukast|10 mg|Tablet|ACME Laboratories Ltd.|16|10|30|3 x 10
Monas|Montelukast|5 mg|Chewable Tablet|ACME Laboratories Ltd.|12|10|30|3 x 10
Montene|Montelukast|10 mg|Tablet|Beximco Pharmaceuticals Ltd.|16|10|30|3 x 10
Montene|Montelukast|4 mg|Chewable Tablet|Beximco Pharmaceuticals Ltd.|10|10|30|3 x 10
Sultolin|Salbutamol|2 mg|Tablet|Square Pharmaceuticals PLC|0.50|10|200|20 x 10
Sultolin|Salbutamol|4 mg|Tablet|Square Pharmaceuticals PLC|0.70|10|200|20 x 10
Sultolin|Salbutamol|2 mg/5 ml|Syrup|Square Pharmaceuticals PLC|25|||100 ml bottle
Azmasol|Salbutamol|100 mcg/puff|Inhaler|Beximco Pharmaceuticals Ltd.|180|||200 puffs
Ventolin|Salbutamol|100 mcg/puff|Inhaler|GSK Bangladesh Ltd.|250|||200 puffs
Bexitrol F|Salmeterol + Fluticasone|25 mcg+125 mcg/puff|Inhaler|Beximco Pharmaceuticals Ltd.|650|||120 puffs
Doxiva|Doxofylline|400 mg|Tablet|Square Pharmaceuticals PLC|8|10|30|3 x 10
Adovas|Herbal cough syrup||Syrup|Square Pharmaceuticals PLC|90|||100 ml bottle
Tusca|Dextromethorphan + Pseudoephedrine + Triprolidine||Syrup|Square Pharmaceuticals PLC|70|||100 ml bottle
Ambrox|Ambroxol|15 mg/5 ml|Syrup|Square Pharmaceuticals PLC|45|||100 ml bottle
Bromex|Bromhexine|4 mg/5 ml|Syrup|Beximco Pharmaceuticals Ltd.|35|||100 ml bottle
Azithrocin|Azithromycin|500 mg|Tablet|Beximco Pharmaceuticals Ltd.|40|3|12|4 x 3
Azithrocin|Azithromycin|250 mg|Tablet|Beximco Pharmaceuticals Ltd.|25|6|24|4 x 6
Azithrocin|Azithromycin|200 mg/5 ml|Powder for Suspension|Beximco Pharmaceuticals Ltd.|140|||15 ml bottle
Zimax|Azithromycin|500 mg|Tablet|Square Pharmaceuticals PLC|40|3|12|4 x 3
Zimax|Azithromycin|200 mg/5 ml|Powder for Suspension|Square Pharmaceuticals PLC|140|||15 ml bottle
Zithrin|Azithromycin|500 mg|Tablet|Renata PLC|40|3|12|4 x 3
Ciprocin|Ciprofloxacin|500 mg|Tablet|Square Pharmaceuticals PLC|15|10|50|5 x 10
Ciprocin|Ciprofloxacin|250 mg|Tablet|Square Pharmaceuticals PLC|9|10|50|5 x 10
Cipro-A|Ciprofloxacin|500 mg|Tablet|ACME Laboratories Ltd.|15|10|50|5 x 10
Neofloxin|Ciprofloxacin|500 mg|Tablet|Beximco Pharmaceuticals Ltd.|15|10|50|5 x 10
Levox|Levofloxacin|500 mg|Tablet|Opsonin Pharma Ltd.|16|10|30|3 x 10
Leflox|Levofloxacin|500 mg|Tablet|Eskayef Pharmaceuticals Ltd.|16|10|30|3 x 10
Moxacil|Amoxicillin|500 mg|Capsule|Square Pharmaceuticals PLC|5|10|100|10 x 10
Moxacil|Amoxicillin|250 mg|Capsule|Square Pharmaceuticals PLC|3|10|100|10 x 10
Moxacil|Amoxicillin|125 mg/5 ml|Powder for Suspension|Square Pharmaceuticals PLC|60|||100 ml bottle
Fimoxyl|Amoxicillin|500 mg|Capsule|Opsonin Pharma Ltd.|5|10|100|10 x 10
Moxaclav|Amoxicillin + Clavulanic Acid|500 mg+125 mg|Tablet|Square Pharmaceuticals PLC|30|7|14|2 x 7
Moxaclav|Amoxicillin + Clavulanic Acid|875 mg+125 mg|Tablet|Square Pharmaceuticals PLC|45|7|14|2 x 7
Fluclox|Flucloxacillin|500 mg|Capsule|Square Pharmaceuticals PLC|8|10|50|5 x 10
Flubex|Flucloxacillin|500 mg|Capsule|Beximco Pharmaceuticals Ltd.|8|10|50|5 x 10
Cef-3|Cefixime|200 mg|Capsule|Square Pharmaceuticals PLC|35|6|12|2 x 6
Cef-3|Cefixime|400 mg|Capsule|Square Pharmaceuticals PLC|55|6|12|2 x 6
Cef-3|Cefixime|100 mg/5 ml|Powder for Suspension|Square Pharmaceuticals PLC|180|||37.5 ml bottle
Triocim|Cefixime|200 mg|Capsule|Eskayef Pharmaceuticals Ltd.|35|6|12|2 x 6
Triocim|Cefixime|400 mg|Capsule|Eskayef Pharmaceuticals Ltd.|55|6|12|2 x 6
Cefotil|Cefuroxime|500 mg|Tablet|Square Pharmaceuticals PLC|50|4|16|4 x 4
Cefotil|Cefuroxime|250 mg|Tablet|Square Pharmaceuticals PLC|30|4|16|4 x 4
Kilbac|Cefuroxime|500 mg|Tablet|Beximco Pharmaceuticals Ltd.|50|4|16|4 x 4
Sefrad|Cephradine|500 mg|Capsule|Square Pharmaceuticals PLC|12|10|50|5 x 10
Doxicap|Doxycycline|100 mg|Capsule|Square Pharmaceuticals PLC|3|10|100|10 x 10
Amodis|Metronidazole|400 mg|Tablet|Square Pharmaceuticals PLC|1.50|10|200|20 x 10
Amodis|Metronidazole|200 mg/5 ml|Suspension|Square Pharmaceuticals PLC|40|||60 ml bottle
Filmet|Metronidazole|400 mg|Tablet|Beximco Pharmaceuticals Ltd.|1.50|10|200|20 x 10
Flagyl|Metronidazole|400 mg|Tablet|Sanofi Bangladesh Ltd.|1.80|10|200|20 x 10
Klabid|Clarithromycin|500 mg|Tablet|Square Pharmaceuticals PLC|45|4|12|3 x 4
Nitrofur|Nitrofurantoin|100 mg|Capsule|Opsonin Pharma Ltd.|6|10|30|3 x 10
Flugal|Fluconazole|50 mg|Capsule|Square Pharmaceuticals PLC|10|10|30|3 x 10
Flugal|Fluconazole|150 mg|Capsule|Square Pharmaceuticals PLC|25|1|10|10 x 1
Neosten|Clotrimazole|1%|Cream|Square Pharmaceuticals PLC|45|||10 g tube
Ecozol|Econazole|1%|Cream|Square Pharmaceuticals PLC|50|||10 g tube
Fusid|Fusidic Acid|2%|Cream|Square Pharmaceuticals PLC|110|||10 g tube
Betnovate|Betamethasone|0.1%|Cream|GSK Bangladesh Ltd.|60|||15 g tube
Hydrocortisone|Hydrocortisone|1%|Cream|Opsonin Pharma Ltd.|30|||10 g tube
Scabex|Permethrin|5%|Cream|Square Pharmaceuticals PLC|70|||30 g tube
Naprosyn|Naproxen|500 mg|Tablet|Radiant Pharmaceuticals Ltd.|8|10|50|5 x 10
Napro-A|Naproxen|500 mg|Tablet|ACME Laboratories Ltd.|8|10|50|5 x 10
Clofenac|Diclofenac Sodium|50 mg|Tablet|Square Pharmaceuticals PLC|1.50|10|100|10 x 10
Clofenac SR|Diclofenac Sodium|100 mg|Tablet|Square Pharmaceuticals PLC|3|10|100|10 x 10
Clofenac|Diclofenac Sodium|1%|Gel|Square Pharmaceuticals PLC|60|||20 g tube
Flexi|Aceclofenac|100 mg|Tablet|Square Pharmaceuticals PLC|5|10|50|5 x 10
Rolac|Ketorolac Tromethamine|10 mg|Tablet|Renata PLC|12|10|30|3 x 10
Tufnil|Tolfenamic Acid|200 mg|Tablet|Eskayef Pharmaceuticals Ltd.|7|10|30|3 x 10
Etorix|Etoricoxib|90 mg|Tablet|Square Pharmaceuticals PLC|12|10|30|3 x 10
Etorix|Etoricoxib|120 mg|Tablet|Square Pharmaceuticals PLC|15|10|30|3 x 10
Inflam|Ibuprofen|400 mg|Tablet|Opsonin Pharma Ltd.|1.50|10|200|20 x 10
Ultrafen|Ibuprofen + Paracetamol|200 mg+500 mg|Tablet|Eskayef Pharmaceuticals Ltd.|3|10|100|10 x 10
Tramadol|Tramadol|50 mg|Capsule|Square Pharmaceuticals PLC|4|10|30|3 x 10
Amdocal|Amlodipine|5 mg|Tablet|Beximco Pharmaceuticals Ltd.|4|10|100|10 x 10
Amdocal|Amlodipine|10 mg|Tablet|Beximco Pharmaceuticals Ltd.|6|10|50|5 x 10
Camlodin|Amlodipine|5 mg|Tablet|Square Pharmaceuticals PLC|4|10|100|10 x 10
Angilock|Losartan Potassium|50 mg|Tablet|Square Pharmaceuticals PLC|8|10|60|6 x 10
Angilock|Losartan Potassium|25 mg|Tablet|Square Pharmaceuticals PLC|5|10|60|6 x 10
Angilock Plus|Losartan + Hydrochlorothiazide|50 mg+12.5 mg|Tablet|Square Pharmaceuticals PLC|10|10|60|6 x 10
Osartil|Losartan Potassium|50 mg|Tablet|Incepta Pharmaceuticals Ltd.|8|10|60|6 x 10
Camlosart|Amlodipine + Olmesartan|5 mg+20 mg|Tablet|Square Pharmaceuticals PLC|12|10|30|3 x 10
Olmesan|Olmesartan|20 mg|Tablet|Beximco Pharmaceuticals Ltd.|10|10|30|3 x 10
Bisocor|Bisoprolol|2.5 mg|Tablet|Beximco Pharmaceuticals Ltd.|5|10|50|5 x 10
Bisocor|Bisoprolol|5 mg|Tablet|Beximco Pharmaceuticals Ltd.|7|10|50|5 x 10
Tenoren|Atenolol|50 mg|Tablet|ACME Laboratories Ltd.|1.50|10|100|10 x 10
Metocard|Metoprolol|50 mg|Tablet|Opsonin Pharma Ltd.|3|10|100|10 x 10
Lasix|Furosemide|40 mg|Tablet|Sanofi Bangladesh Ltd.|1.20|10|100|10 x 10
Spirocard|Spironolactone|25 mg|Tablet|Opsonin Pharma Ltd.|4|10|50|5 x 10
Atova|Atorvastatin|10 mg|Tablet|Beximco Pharmaceuticals Ltd.|8|10|30|3 x 10
Atova|Atorvastatin|20 mg|Tablet|Beximco Pharmaceuticals Ltd.|13|10|30|3 x 10
Anzitor|Atorvastatin|10 mg|Tablet|Square Pharmaceuticals PLC|8|10|30|3 x 10
Rosuva|Rosuvastatin|10 mg|Tablet|Square Pharmaceuticals PLC|13|10|30|3 x 10
Rovast|Rosuvastatin|5 mg|Tablet|Incepta Pharmaceuticals Ltd.|8|10|30|3 x 10
Ecosprin|Aspirin|75 mg|Tablet|ACI Limited|0.70|28|280|10 x 28
Anclog|Clopidogrel|75 mg|Tablet|Square Pharmaceuticals PLC|9|10|30|3 x 10
Clopid AS|Clopidogrel + Aspirin|75 mg+75 mg|Tablet|Beximco Pharmaceuticals Ltd.|10|10|30|3 x 10
Nitrocontin|Glyceryl Trinitrate|2.6 mg|Tablet|Square Pharmaceuticals PLC|5|10|50|5 x 10
Comet|Metformin|500 mg|Tablet|Square Pharmaceuticals PLC|3|10|100|10 x 10
Comet|Metformin|850 mg|Tablet|Square Pharmaceuticals PLC|4.50|10|100|10 x 10
Comet XR|Metformin|500 mg|Tablet|Square Pharmaceuticals PLC|5|10|50|5 x 10
Informet|Metformin|500 mg|Tablet|Incepta Pharmaceuticals Ltd.|3|10|100|10 x 10
Comprid|Gliclazide|80 mg|Tablet|Square Pharmaceuticals PLC|4|10|100|10 x 10
Comprid MR|Gliclazide|30 mg|Tablet|Square Pharmaceuticals PLC|6|10|50|5 x 10
Secrin|Glimepiride|2 mg|Tablet|Healthcare Pharmaceuticals Ltd.|7|10|50|5 x 10
Amaryl|Glimepiride|2 mg|Tablet|Sanofi Bangladesh Ltd.|10|10|30|3 x 10
Sitaglip|Sitagliptin|50 mg|Tablet|Beximco Pharmaceuticals Ltd.|20|10|30|3 x 10
Linatab|Linagliptin|5 mg|Tablet|Incepta Pharmaceuticals Ltd.|25|10|30|3 x 10
Empa|Empagliflozin|10 mg|Tablet|Square Pharmaceuticals PLC|30|10|30|3 x 10
Insulatard|Insulin Isophane (Human)|100 IU/ml|Injection|Novo Nordisk|450|||10 ml vial
Mixtard 30|Insulin Human (30/70)|100 IU/ml|Injection|Novo Nordisk|450|||10 ml vial
Thyrox|Levothyroxine|50 mcg|Tablet|Renata PLC|1.50|10|100|10 x 10
Calbo-D|Calcium Carbonate + Vitamin D3|500 mg+200 IU|Tablet|Square Pharmaceuticals PLC|9|15|30|2 x 15
Calbo|Calcium Carbonate|500 mg|Tablet|Square Pharmaceuticals PLC|5|15|30|2 x 15
Aristocal-D|Calcium Carbonate + Vitamin D3|500 mg+200 IU|Tablet|Aristopharma Ltd.|8|15|30|2 x 15
Coralcal-D|Coral Calcium + Vitamin D3|500 mg+200 IU|Tablet|Radiant Pharmaceuticals Ltd.|10|15|30|2 x 15
Neuro-B|Vitamin B1 + B6 + B12|100 mg+200 mg+200 mcg|Tablet|Square Pharmaceuticals PLC|7|10|30|3 x 10
Ceevit|Vitamin C|250 mg|Chewable Tablet|Square Pharmaceuticals PLC|1.50|10|200|20 x 10
Fefol|Ferrous Sulfate + Folic Acid|150 mg+0.5 mg|Capsule|GSK Bangladesh Ltd.|2.50|10|100|10 x 10
Zif-CI|Iron + Folic Acid + Zinc|150 mg+0.5 mg+61.8 mg|Capsule|Incepta Pharmaceuticals Ltd.|3|10|100|10 x 10
Folison|Folic Acid|5 mg|Tablet|Square Pharmaceuticals PLC|1|10|100|10 x 10
D-Rise|Cholecalciferol|20000 IU|Capsule|Beximco Pharmaceuticals Ltd.|30|4|20|5 x 4
Filwel Gold|Multivitamin + Multimineral||Tablet|Square Pharmaceuticals PLC|10|15|30|2 x 15
Cortan|Prednisolone|5 mg|Tablet|Square Pharmaceuticals PLC|1|10|100|10 x 10
Cortan|Prednisolone|20 mg|Tablet|Square Pharmaceuticals PLC|3.50|10|50|5 x 10
Oradexon|Dexamethasone|0.5 mg|Tablet|Organon Bangladesh Ltd.|0.50|10|200|20 x 10
Deflacort|Deflazacort|6 mg|Tablet|Incepta Pharmaceuticals Ltd.|10|10|30|3 x 10
Rivotril|Clonazepam|0.5 mg|Tablet|Radiant Pharmaceuticals Ltd.|6|10|30|3 x 10
Disopan|Clonazepam|0.5 mg|Tablet|Incepta Pharmaceuticals Ltd.|5|10|50|5 x 10
Sedil|Diazepam|5 mg|Tablet|Square Pharmaceuticals PLC|1|10|100|10 x 10
Frenxit|Flupentixol + Melitracen|0.5 mg+10 mg|Tablet|Square Pharmaceuticals PLC|6|10|50|5 x 10
Amitriptyline|Amitriptyline|10 mg|Tablet|Opsonin Pharma Ltd.|1|10|100|10 x 10
Pregaba|Pregabalin|75 mg|Capsule|Square Pharmaceuticals PLC|15|10|30|3 x 10
Neugaba|Pregabalin|75 mg|Capsule|Beximco Pharmaceuticals Ltd.|15|10|30|3 x 10
Vertina|Betahistine|8 mg|Tablet|Square Pharmaceuticals PLC|4|10|50|5 x 10
Stemetil|Prochlorperazine|5 mg|Tablet|Sanofi Bangladesh Ltd.|1.50|10|100|10 x 10
Tamen|Tamsulosin|0.4 mg|Capsule|Eskayef Pharmaceuticals Ltd.|12|10|30|3 x 10
Urocit-K|Potassium Citrate|10 mEq|Tablet|Square Pharmaceuticals PLC|10|10|30|3 x 10
Algin|Tiemonium Methylsulphate|50 mg|Tablet|Square Pharmaceuticals PLC|4|10|100|10 x 10
Viset|Tiemonium Methylsulphate|50 mg|Tablet|Opsonin Pharma Ltd.|4|10|100|10 x 10
Moxiquin|Moxifloxacin|0.5%|Eye Drop|Square Pharmaceuticals PLC|150|||5 ml bottle
Tears Naturale|Dextran + Hypromellose||Eye Drop|Alcon|250|||15 ml bottle
Otosporin|Neomycin + Polymyxin B + Hydrocortisone||Ear Drop|GSK Bangladesh Ltd.|90|||5 ml bottle
Nasomet|Mometasone Furoate|50 mcg/spray|Nasal Spray|Square Pharmaceuticals PLC|380|||120 sprays
Xylomet|Xylometazoline|0.1%|Nasal Spray|Square Pharmaceuticals PLC|60|||10 ml bottle
Hexisol|Chlorhexidine|2%|Hand Rub|ACI Limited|120|||250 ml bottle
Savlon|Chloroxylenol|4.8%|Antiseptic Liquid|ACI Limited|90|||100 ml bottle
Povisep|Povidone Iodine|10%|Solution|Jayson Pharmaceuticals Ltd.|70|||100 ml bottle
Burnsil|Silver Sulfadiazine|1%|Cream|Opsonin Pharma Ltd.|80|||25 g tube
Femicon|Levonorgestrel + Ethinylestradiol|0.15 mg+0.03 mg|Tablet|SMC Enterprise Ltd.|40|28|28|1 x 28
Norium|Norethisterone|5 mg|Tablet|Square Pharmaceuticals PLC|6|10|30|3 x 10
`
