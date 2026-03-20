with open(r'd:\Projects\Tea-Planter\FrontEnd\src\app\pages\AttendancePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    print(f"Opening (: {content.count('(')}")
    print(f"Closing ): {content.count(')')}")
