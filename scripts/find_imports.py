import os, re

imports = set()
pattern = re.compile(r'(?:import|export)\s+(?:.*?from\s+)?[\'"]([@\w\d\.\-\/]+)[\'"]')
pattern2 = re.compile(r'require\([\'"]([@\w\d\.\-\/]+)[\'"]\)')

for folder in ['src', 'scripts', 'tests', 'e2e']:
    if not os.path.exists(folder):
        continue
    for root, dirs, files in os.walk(folder):
        for f in files:
            if f.endswith(('.ts', '.tsx', '.js', '.jsx')):
                p = os.path.join(root, f)
                with open(p, 'r', encoding='utf-8', errors='ignore') as fl:
                    c = fl.read()
                    for m in pattern.findall(c):
                        if not m.startswith('.') and not m.startswith('@/'):
                            pkg = m.split('/')[0] if not m.startswith('@') else '/'.join(m.split('/')[:2])
                            imports.add(pkg)
                    for m in pattern2.findall(c):
                        if not m.startswith('.') and not m.startswith('@/'):
                            pkg = m.split('/')[0] if not m.startswith('@') else '/'.join(m.split('/')[:2])
                            imports.add(pkg)

print("Unique third-party / external imports:")
for imp in sorted(list(imports)):
    print(" -", imp)
