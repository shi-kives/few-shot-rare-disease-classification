import csv
import json
from pathlib import Path

label_index = {
    0: 'MEL',
    1: 'NV',
    2: 'BCC',
    3: 'AKIEC',
    4: 'BKL',
    5: 'DF',
    6: 'VASC'
}
mapping = {}
path = 'isic/ISIC2018_Task3_Training_GroundTruth.csv'

with open(path, mode='r', encoding='utf-8') as file:
    csv_reader = csv.reader(file)
    next(csv_reader)

    for row in csv_reader:
        for i in row:
            if i == '1.0':
                mapping[row[0]] = row.index(i) - 1
                break

print("debug message. number of entries in matching (should be 10015):\n", len(mapping))

count = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
}

for index in mapping.values():
    count[index] += 1

print("debug, checking distribution to find novel classes:\n", count)
sorted_count = dict(sorted(count.items(), key = lambda item: item[1]))

print("\nleast distributed classes: ")
i = 0
for key, value in sorted_count.items():
    if i < 3:
        i+=1
        print(f"{label_index[key]} : {value}")

final = {
    "base_classes": [0, 1, 2, 4],
    "novel_classes": [3, 5, 6],
    "class_names": label_index
}

path = Path('./processed/splits/')
file_name = path / 'isic_split.json'

with open(file_name, 'w', encoding='utf-8') as f:
    json.dump(final, f, indent=2)

print("isic split json file created.")