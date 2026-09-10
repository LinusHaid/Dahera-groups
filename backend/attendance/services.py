from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, time
from django.utils import timezone

def get_employee_shift(employee):
    """
    Returns (shift_start_time, shift_end_time, shift_hours) for a given employee.
    Defaults to 09:30 - 17:30 (Female) or 10:00 - 18:00 (Male/other).
    """
    if not employee:
        return time(10, 0, 0), time(18, 0, 0), Decimal('8.0')

    start_t = employee.get_shift_start_time() if hasattr(employee, 'get_shift_start_time') else time(10, 0, 0)
    end_t = employee.get_shift_end_time() if hasattr(employee, 'get_shift_end_time') else time(18, 0, 0)

    start_sec = start_t.hour * 3600 + start_t.minute * 60 + start_t.second
    end_sec = end_t.hour * 3600 + end_t.minute * 60 + end_t.second
    diff_sec = end_sec - start_sec
    if diff_sec <= 0:
        shift_hours = Decimal('8.0')
    else:
        shift_hours = Decimal(str(round(diff_sec / 3600.0, 4)))

    return start_t, end_t, shift_hours


def calculate_unworked_duration(check_in_dt, check_out_dt, shift_start_time, shift_end_time):
    """
    Calculates total unworked shift duration considering both late check-in and early check-out.
    Returns (total_unworked_minutes, unworked_hours, unworked_minutes).
    """
    if not check_in_dt or not shift_start_time or not shift_end_time:
        return 0, 0, 0

    local_check_in = timezone.localtime(check_in_dt)
    target_date = local_check_in.date()
    tz = local_check_in.tzinfo

    shift_start_dt = datetime.combine(target_date, shift_start_time, tzinfo=tz)
    shift_end_dt = datetime.combine(target_date, shift_end_time, tzinfo=tz)

    if shift_end_dt <= shift_start_dt:
        shift_end_dt = shift_end_dt + timezone.timedelta(days=1)

    shift_seconds = int((shift_end_dt - shift_start_dt).total_seconds())

    # 1. Late check-in unworked seconds
    if local_check_in > shift_start_dt:
        effective_in = min(local_check_in, shift_end_dt)
        late_in_seconds = max(0, int((effective_in - shift_start_dt).total_seconds()))
    else:
        late_in_seconds = 0

    # 2. Early check-out unworked seconds
    early_out_seconds = 0
    if check_out_dt:
        local_check_out = timezone.localtime(check_out_dt)
        if local_check_out < shift_end_dt:
            effective_out = max(local_check_out, shift_start_dt)
            early_out_seconds = max(0, int((shift_end_dt - effective_out).total_seconds()))

    total_unworked_seconds = min(shift_seconds, late_in_seconds + early_out_seconds)
    total_unworked_minutes = total_unworked_seconds // 60

    unworked_hours = total_unworked_minutes // 60
    unworked_minutes = total_unworked_minutes % 60

    return total_unworked_minutes, unworked_hours, unworked_minutes


def calculate_late_duration(check_in_dt, shift_start_time, shift_end_time):
    """
    Calculates late duration in minutes, hours, and formatted details.
    Capped at shift_end_time.
    Returns (total_late_minutes, late_hours, late_minutes).
    """
    return calculate_unworked_duration(check_in_dt, None, shift_start_time, shift_end_time)


def calculate_late_deduction(base_salary, total_late_minutes, working_days=26, shift_hours=8):
    """
    Calculates dynamic late salary deduction based on base salary using Python Decimal.
    
    Formula:
    - Daily salary = base_salary / working_days (default 26)
    - Hourly salary = daily_salary / shift_hours (default 8)
    - Minute salary = hourly_salary / 60
    
    4-Hour Rule:
    - total_late_minutes < 240: total_late_minutes * minute_salary
    - total_late_minutes == 240: 0.5 * daily_salary
    - total_late_minutes > 240: 0.5 * daily_salary + (total_late_minutes - 240) * minute_salary
    
    Capped at 1 full-day salary.
    """
    if total_late_minutes <= 0:
        return Decimal('0.00')

    try:
        salary_dec = Decimal(str(base_salary or 0))
        days_dec = Decimal(str(working_days or 26))
        hours_dec = Decimal(str(shift_hours or 8))
    except Exception:
        return Decimal('0.00')

    if salary_dec <= Decimal('0.00') or days_dec <= Decimal('0.00') or hours_dec <= Decimal('0.00'):
        return Decimal('0.00')

    daily_salary = salary_dec / days_dec
    hourly_salary = daily_salary / hours_dec
    minute_salary = hourly_salary / Decimal('60')

    late_min_dec = Decimal(str(total_late_minutes))

    if total_late_minutes < 240:
        deduction = late_min_dec * minute_salary
    elif total_late_minutes == 240:
        deduction = Decimal('0.50') * daily_salary
    else:
        extra_minutes = late_min_dec - Decimal('240')
        deduction = (Decimal('0.50') * daily_salary) + (extra_minutes * minute_salary)

    max_deduction = daily_salary
    if deduction > max_deduction:
        deduction = max_deduction

    return deduction.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def evaluate_attendance_record(attendance):
    """
    Populates shift_start, shift_end, late_hours, late_minutes, late_deduction, and status on Attendance.
    Handles both late check-in and early logout (e.g., checkout at 3 PM).
    """
    if not attendance or not attendance.employee:
        return

    emp = attendance.employee
    start_t, end_t, shift_hours = get_employee_shift(emp)

    attendance.shift_start = start_t
    attendance.shift_end = end_t
    attendance.expected_login_time = start_t.strftime("%I:%M %p")

    if not attendance.check_in:
        attendance.late_hours = 0
        attendance.late_minutes = 0
        attendance.late_deduction = Decimal('0.00')
        return

    total_unworked_mins, u_hours, u_mins = calculate_unworked_duration(
        attendance.check_in,
        attendance.check_out,
        start_t,
        end_t
    )

    attendance.late_hours = u_hours
    attendance.late_minutes = u_mins

    if total_unworked_mins >= 240 and total_unworked_mins < 480:
        attendance.status = attendance.Status.HALF_DAY
    elif total_unworked_mins > 0:
        attendance.status = attendance.Status.LATE
    else:
        if attendance.check_in and attendance.check_out:
            attendance.status = attendance.Status.COMPLETED
        else:
            attendance.status = attendance.Status.ON_TIME

    if total_unworked_mins > 0:
        base_salary = getattr(emp, 'base_salary', Decimal('0.00'))
        attendance.late_deduction = calculate_late_deduction(
            base_salary=base_salary,
            total_late_minutes=total_unworked_mins,
            working_days=26,
            shift_hours=shift_hours
        )
    else:
        attendance.late_deduction = Decimal('0.00')
