-- Table: aus_language_classification
-- Source: https://visaenvoy.com/australia-pr-points-calculator-from-16-november-2019/

CREATE TABLE IF NOT EXISTS aus_language_classification (
    classification VARCHAR(50),
    test_name VARCHAR(100),
    listening_score VARCHAR(20),
    reading_score VARCHAR(20),
    writing_score VARCHAR(20),
    speaking_score VARCHAR(20),
    other_requirement VARCHAR(255)
);

COMMENT ON TABLE aus_language_classification IS 'Source: https://visaenvoy.com/australia-pr-points-calculator-from-16-november-2019/';

INSERT INTO aus_language_classification (classification, test_name, listening_score, reading_score, writing_score, speaking_score, other_requirement) VALUES
('Competent English', 'Passport', 'N/A', 'N/A', 'N/A', 'N/A', 'UK/USA/Ireland/Canada/NZ'),
('Competent English', 'IELTS', '6', '6', '6', '6', NULL),
('Competent English', 'PTE Academic', '47', '48', '51', '54', NULL),
('Competent English', 'Cambridge (CAE)', '163', '163', '170', '179', NULL),
('Competent English', 'TOEFL iBT', '16', '16', '19', '19', NULL),
('Competent English', 'CELPIP General', '7', '7', '7', '7', NULL),
('Competent English', 'Michigan English Test (MET)', '56', '55', '57', '48', NULL),
('Competent English', 'Occupational English Test (OET)', '290', '310', '290', '330', NULL),
('Competent English', 'LANGUGECERT Academic', '57', '60', '64', '70', NULL),
('Proficient English', 'IELTS', '7', '7', '7', '7', NULL),
('Proficient English', 'PTE Academic', '58', '59', '69', '76', NULL),
('Proficient English', 'Cambridge (CAE)', '175', '179', '193', '194', NULL),
('Proficient English', 'TOEFL iBT', '22', '22', '26', '24', NULL),
('Proficient English', 'CELPIP General', '9', '8', '10', '8', NULL),
('Proficient English', 'Michigan English Test (MET)', '61', '63', '74', '59', NULL),
('Proficient English', 'Occupational English Test (OET)', '350', '360', '380', '360', NULL),
('Proficient English', 'LANGUGECERT Academic', '67', '71', '78', '82', NULL),
('Superior English', 'IELTS', '8', '8', '8', '8', NULL),
('Superior English', 'PTE Academic', '69', '70', '85', '88', NULL),
('Superior English', 'Cambridge (CAE)', '186', '190', '210', '208', NULL),
('Superior English', 'TOEFL iBT', '26', '27', '30', '28', NULL),
('Superior English', 'CELPIP General', '10', '10', '12', '10', NULL),
('Superior English', 'Michigan English Test (MET)', 'N/A', 'N/A', 'N/A', 'N/A', NULL),
('Superior English', 'Occupational English Test (OET)', '390', '400', '420', '400', NULL),
('Superior English', 'LANGUGECERT Academic', '80', '83', '89', '89', NULL);
