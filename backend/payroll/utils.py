import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_salary_slip_pdf(salary_slip) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#881337'),
        alignment=1
    )
    subtitle_style = ParagraphStyle(
        'HeaderSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#52525B'),
        alignment=1
    )
    section_heading = ParagraphStyle(
        'SecHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#881337'),
        spaceBefore=10,
        spaceAfter=6
    )
    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1C1917')
    )
    cell_normal = ParagraphStyle(
        'CellNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#44403C')
    )

    elements = []

    elements.append(Paragraph("THAHIRA GROUPS ENTERPRISE", title_style))
    elements.append(Paragraph("Official Monthly Salary & Payroll Statement", subtitle_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#881337'), spaceAfter=12))

    emp = salary_slip.employee
    emp_name = emp.get_full_name() or emp.username
    emp_id = emp.employee_id or 'N/A'
    dept = emp.department or 'Engineering'
    desig = emp.designation or 'Staff Member'
    month_name = salary_slip.get_month_name()
    year = salary_slip.year

    info_data = [
        [
            Paragraph("<b>Employee Name:</b>", cell_bold), Paragraph(emp_name, cell_normal),
            Paragraph("<b>Pay Period:</b>", cell_bold), Paragraph(f"{month_name} {year}", cell_normal)
        ],
        [
            Paragraph("<b>Employee ID:</b>", cell_bold), Paragraph(emp_id, cell_normal),
            Paragraph("<b>Department:</b>", cell_bold), Paragraph(dept, cell_normal)
        ],
        [
            Paragraph("<b>Designation:</b>", cell_bold), Paragraph(desig, cell_normal),
            Paragraph("<b>Payment Status:</b>", cell_bold), Paragraph(f"<font color='#15803D'><b>{salary_slip.status}</b></font>", cell_normal)
        ]
    ]

    info_table = Table(info_data, colWidths=[100, 170, 100, 170])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FAF9F6')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E7E5E4')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F5F5F4')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Calendar Month & Attendance Breakdown", section_heading))
    cal_data = [
        [
            Paragraph("<b>Working Days:</b>", cell_bold), Paragraph(f"{salary_slip.working_days} Days", cell_normal),
            Paragraph("<b>Per-Day Salary Rate:</b>", cell_bold), Paragraph(f"<b>₹{salary_slip.daily_rate:,.2f} / day</b>", cell_normal)
        ],
        [
            Paragraph("<b>Present Days / Absences:</b>", cell_bold), Paragraph(f"{salary_slip.present_days} Present / {salary_slip.absent_days} Absent", cell_normal),
            Paragraph("<b>Late Arrivals / Half-Days:</b>", cell_bold), Paragraph(f"{salary_slip.late_days} Late ({salary_slip.half_days or 0} Half-Day, {salary_slip.total_late_hours}h {salary_slip.total_late_minutes}m)", cell_normal)
        ],
        [
            Paragraph("<b>Unpaid Leave Days:</b>", cell_bold), Paragraph(f"{salary_slip.leave_days_deducted} Days", cell_normal),
            Paragraph("<b>Leave Deduction Amount:</b>", cell_bold), Paragraph(f"<font color='#991B1B'><b>-₹{salary_slip.leave_deduction_amount:,.2f}</b></font>", cell_normal)
        ]
    ]
    cal_table = Table(cal_data, colWidths=[130, 140, 130, 140])
    cal_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFF1F2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#FFE4E6')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#FECDD3')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(cal_table)
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Earnings & Deductions Summary", section_heading))
    
    total_deductions_val = (salary_slip.leave_deduction_amount or 0) + (salary_slip.late_salary_deduction or 0) + (salary_slip.deductions or 0)

    table_data = [
        [
            Paragraph("<b>Earnings Description</b>", cell_bold), Paragraph("<b>Amount (₹)</b>", cell_bold),
            Paragraph("<b>Deductions Description</b>", cell_bold), Paragraph("<b>Amount (₹)</b>", cell_bold)
        ],
        [Paragraph("Base Monthly Basic Salary", cell_normal), Paragraph(f"₹{salary_slip.basic_salary:,.2f}", cell_normal), Paragraph("Leave Absence Deduction", cell_normal), Paragraph(f"-₹{salary_slip.leave_deduction_amount:,.2f}", cell_normal)],
        [Paragraph("HRA & Allowances", cell_normal), Paragraph(f"₹{salary_slip.allowances:,.2f}", cell_normal), Paragraph("Attendance Late Deduction", cell_normal), Paragraph(f"-₹{salary_slip.late_salary_deduction:,.2f}", cell_normal)],
        [Paragraph("Other Earnings", cell_normal), Paragraph("₹0.00", cell_normal), Paragraph("PF / Tax / Other Deductions", cell_normal), Paragraph(f"-₹{salary_slip.deductions:,.2f}", cell_normal)],
        [
            Paragraph("<b>Total Gross Earnings</b>", cell_bold),
            Paragraph(f"<b>₹{(salary_slip.basic_salary + salary_slip.allowances):,.2f}</b>", cell_bold),
            Paragraph("<b>Total Deductions</b>", cell_bold),
            Paragraph(f"<b>₹{total_deductions_val:,.2f}</b>", cell_bold)
        ]
    ]

    breakdown_table = Table(table_data, colWidths=[150, 120, 150, 120])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#881337')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D6D3D1')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#F5F5F4')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(breakdown_table)
    elements.append(Spacer(1, 15))

    net_pay_data = [
        [
            Paragraph("<b>NET TAKE-HOME SALARY PAYABLE:</b>", ParagraphStyle('NetLbl', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#881337'))),
            Paragraph(f"<b>₹{salary_slip.net_salary:,.2f}</b>", ParagraphStyle('NetVal', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#15803D'), alignment=2))
        ]
    ]
    net_table = Table(net_pay_data, colWidths=[300, 240])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor('#16A34A')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(net_table)
    elements.append(Spacer(1, 20))

    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        textColor=colors.HexColor('#71717A'),
        alignment=1
    )
    elements.append(Paragraph("This is a computer-generated salary slip. Authorized by Thahira Groups Enterprise.", footer_style))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
