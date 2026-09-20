import sys
sys.path.insert(0, r'c:\Users\AL-Motahida\Documents\antigravity\charming-darwin\electrical_sld_studio')
from backend.auth import verify_login, get_users_list
from backend.calculations import calculate_network_metrics
from backend.project_manager import get_demo_video_project
from backend.excel_exporter import export_network_to_excel
from backend.powerpoint_exporter import export_network_to_powerpoint
import base64
from io import BytesIO
from PIL import Image

# 1. Test Auth
print('--- Testing Auth ---')
users = get_users_list()
print('Users count:', len(users))
res_ok = verify_login('admin', '123450')
assert res_ok['success'] is True, 'Admin login failed'
print('Admin login with 123450: SUCCESS')

res_fail = verify_login('admin', 'wrong_pass')
assert res_fail['success'] is False, 'Wrong pass should fail'
print('Wrong pass rejection: SUCCESS')

# 2. Test Video Case Study Metrics
print('\n--- Testing Video Case Study Calculations ---')
demo = get_demo_video_project()
metrics = calculate_network_metrics(demo['nodes'], demo['sections'], demo['voltage_kv'])
tot_len = metrics['summary']['total_feeder_length_m']
print(f'Calculated Total Feeder Length: {tot_len} meters')
assert tot_len == 24350.0, f'Expected 24350.0 m but got {tot_len}'
print('Total Length Matches Video 3 EXACTLY: 24,350 m!')

print('Total Transformers Capacity:', metrics['summary']['total_capacity_kva'], 'kVA')
print('Total Actual Load:', metrics['summary']['total_actual_load_kva'], 'kVA')
print('Total Feeder Current:', metrics['summary']['total_feeder_current_a'], 'A')
print('Max Voltage Drop:', metrics['summary']['max_voltage_drop_pct'], '%')

# 3. Test Excel Export
print('\n--- Testing Excel Export ---')
excel_bytes = export_network_to_excel(demo, metrics)
assert len(excel_bytes) > 1000, 'Excel bytes empty'
print(f'Generated Excel size: {len(excel_bytes)} bytes - SUCCESS')

# 4. Test PowerPoint Presentation Export
print('\n--- Testing PowerPoint Presentation Export ---')
# Create a test drawing image
test_img = Image.new('RGB', (1600, 900), color=(255, 255, 255))
buf = BytesIO()
test_img.save(buf, format='PNG')
test_b64 = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')

pptx_bytes = export_network_to_powerpoint(demo, metrics, image_base64=test_b64)
assert len(pptx_bytes) > 10000, 'PowerPoint bytes empty or too small'
print(f'Generated PowerPoint size: {len(pptx_bytes)} bytes - SUCCESS')

print('\nALL TESTS PASSED WITH 100% SUCCESS!')
