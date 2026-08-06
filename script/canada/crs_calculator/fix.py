import json

def fix_html():
    with open("crs_points.json", "r", encoding="utf-8") as f:
        data = f.read()
        
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canada CRS Point Calculator</title>
    <style>
        :root {{
            --primary: #1976d2;
            --primary-light: #63a4ff;
            --primary-dark: #004ba0;
            --background: #f4f6f8;
            --surface: #ffffff;
            --text: #333333;
            --text-muted: #666666;
            --border: #e0e0e0;
        }}

        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
            margin: 0;
            padding: 2rem;
        }}

        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: var(--surface);
            padding: 2.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.05);
        }}

        h1 {{
            color: var(--primary-dark);
            text-align: center;
            margin-bottom: 0.5rem;
            font-weight: 800;
        }}

        p.subtitle {{
            text-align: center;
            color: var(--text-muted);
            margin-bottom: 2rem;
        }}

        .section {{
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
        }}

        .section h3 {{
            color: var(--primary);
            margin-top: 0;
            margin-bottom: 1rem;
            font-size: 1.15rem;
        }}

        label {{
            display: block;
            margin-bottom: 0.75rem;
            font-weight: 500;
            cursor: pointer;
        }}

        select {{
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 1rem;
            color: var(--text);
            background-color: #fafafa;
            transition: border-color 0.2s;
        }}

        select:focus {{
            outline: none;
            border-color: var(--primary-light);
        }}

        .radio-group {{
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }}

        .radio-label {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            transition: all 0.2s;
        }}

        .radio-label:hover {{
            background-color: #f0f7ff;
            border-color: var(--primary-light);
        }}

        input[type="radio"] {{
            accent-color: var(--primary);
            width: 18px;
            height: 18px;
        }}

        .score-panel {{
            position: sticky;
            bottom: 20px;
            background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(25, 118, 210, 0.3);
            margin-top: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .score-panel h2 {{
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
        }}

        .score-value {{
            font-size: 2.5rem;
            font-weight: 800;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Comprehensive Ranking System (CRS) Tool</h1>
        <p class="subtitle">Calculate your Express Entry CRS score</p>
        
        <form id="crs-form">
            <div id="form-content"></div>
        </form>

        <div class="score-panel">
            <div>
                <h2>Estimated CRS Score</h2>
                <div class="status">Maximum possible score is 1200</div>
            </div>
            <div class="score-value"><span id="total-points">0</span></div>
        </div>
    </div>

    <script>
        const formData = {data};

        const questionLabels = {{
            "q1": "What is your marital status?",
            "q2i": "Is your spouse or common-law partner a citizen or permanent resident of Canada?",
            "q2ii": "Will your spouse or common-law partner come with you to Canada?",
            "q3": "How old are you?",
            "q4": "What is your level of education?",
            "q4b": "Have you earned a Canadian degree, diploma or certificate?",
            "q4c": "Choose the best answer that describes this level of education (Canadian):",
            "q5i": "Are your test results less than two years old?",
            "q5i-a": "Which language test did you take for your first official language?",
            "q6i": "In the last ten years, how many years of skilled work experience in Canada do you have?",
            "q6ii": "In the last 10 years, how many total years of foreign skilled work experience do you have?",
            "q7": "Do you have a certificate of qualification from a Canadian province, territory or federal body?",
            "q8": "Do you have a valid job offer supported by a Labour Market Impact Assessment?",
            "q8a": "Which NOC skill type or level is the job offer?",
            "q9": "Do you have a nomination certificate from a province or territory?",
            "q10i": "Do you or your spouse have at least one brother or sister living in Canada who is a citizen or PR?",
            "q10": "What is the highest level of education for which your spouse or common-law partner's?",
            "q11": "In the last ten years, how many years of skilled work experience in Canada does your spouse have?",
            "q12i": "Did your spouse or common-law partner take a language test?"
        }};

        function renderForm(formData) {{
            const container = document.getElementById('form-content');
            
            const uniqueQuestions = [];
            const seen = new Set();
            for (let item of formData) {{
                if (!seen.has(item.question)) {{
                    seen.add(item.question);
                    uniqueQuestions.push(item);
                }}
            }}

            uniqueQuestions.forEach((section) => {{
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'section';
                
                const title = document.createElement('h3');
                title.textContent = questionLabels[section.question] || `Question: ${{section.question}}`;
                sectionDiv.appendChild(title);
                
                if (section.options.length > 5) {{
                    const select = document.createElement('select');
                    select.name = section.question;
                    select.addEventListener('change', calculatePoints);
                    
                    const defaultOpt = document.createElement('option');
                    defaultOpt.value = "";
                    defaultOpt.textContent = "Select an option...";
                    select.appendChild(defaultOpt);

                    section.options.forEach(opt => {{
                        const option = document.createElement('option');
                        option.value = opt.points_or_value;
                        option.textContent = opt.text;
                        select.appendChild(option);
                    }});
                    
                    sectionDiv.appendChild(select);
                }} else {{
                    const radioGroup = document.createElement('div');
                    radioGroup.className = 'radio-group';
                    
                    section.options.forEach(opt => {{
                        const label = document.createElement('label');
                        label.className = 'radio-label';
                        
                        const input = document.createElement('input');
                        input.type = 'radio';
                        input.name = section.question;
                        input.value = opt.points_or_value;
                        input.addEventListener('change', calculatePoints);
                        
                        label.appendChild(input);
                        label.appendChild(document.createTextNode(opt.text));
                        radioGroup.appendChild(label);
                    }});
                    
                    sectionDiv.appendChild(radioGroup);
                }}
                
                container.appendChild(sectionDiv);
            }});
        }}

        function calculatePoints() {{
            let total = 0;
            const form = document.getElementById('crs-form');
            const data = new FormData(form);
            
            for (let [key, value] of data.entries()) {{
                if (value && value.length > 0) {{
                    let mockScore = (value.charCodeAt(0) - 64) * 10;
                    if (mockScore > 0 && mockScore < 300) {{
                        total += mockScore;
                    }}
                }}
            }}
            
            total = Math.min(total, 1200);
            document.getElementById('total-points').textContent = total;
        }}

        document.addEventListener('DOMContentLoaded', () => {{
            renderForm(formData);
        }});
    </script>
</body>
</html>"""
    
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)
        
if __name__ == "__main__":
    fix_html()
