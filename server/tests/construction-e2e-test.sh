#!/bin/bash
# ============================================================
# 施工流程完整端到端测试 V1.4
# 覆盖：选材下单→设计审核(含驳回重传)→施工→验收→阶段2跳过设计
# ============================================================
set -e

BASE="http://43.136.71.64:8081/api/v1"
PASS=0; FAIL=0; SKIP=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

pass() { PASS=$((PASS+1)); echo -e "${GREEN}  PASS${NC} $1"; }
fail() { FAIL=$((FAIL+1)); echo -e "${RED}  FAIL${NC} $1 - $2"; }
skip() { SKIP=$((SKIP+1)); echo -e "${YELLOW}  SKIP${NC} $1 - $2"; }
section() { echo ""; echo -e "${CYAN}==== $1 ====${NC}"; }

# -- admin login --
ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

section "0. Setup — roles and personnel_type"

echo "Updating user roles..."
curl -s -X PUT "$BASE/admin/designers/5"  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"personnel_type":"designer","role":"designer"}' > /dev/null
echo '  User 5  → designer (personnel_type=designer)'

curl -s -X PUT "$BASE/admin/designers/8"  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"personnel_type":"design_director","role":"designer"}' > /dev/null
echo '  User 8  → design_director'

curl -s -X PUT "$BASE/admin/designers/9"  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"personnel_type":"engineer","role":"designer"}' > /dev/null
echo '  User 9  → engineer'

curl -s -X PUT "$BASE/admin/designers/10" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"personnel_type":"engineering_director","role":"designer"}' > /dev/null
echo '  User 10 → engineering_director'

curl -s -X PUT "$BASE/admin/designers/11" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"owner_property_id":4,"building":"A1","room":"101"}' > /dev/null
echo '  User 11 → owner (bound to property 4)'

# ============================================================
section "1. Login as all 5 roles"
# ============================================================

D_RES=$(curl -s -X POST "$BASE/auth/designer/login/dev" -H 'Content-Type: application/json' -d '{"phone":"13800001111"}')
D_TOKEN=$(echo "$D_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
D_ID=$(echo "$D_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['user']['id'])")
[ -n "$D_TOKEN" ] && pass "Designer login          (id=$D_ID)" || fail "Designer login" "no token"

DD_RES=$(curl -s -X POST "$BASE/auth/designer/login/dev" -H 'Content-Type: application/json' -d '{"phone":"13800002222"}')
DD_TOKEN=$(echo "$DD_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
DD_ID=$(echo "$DD_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['user']['id'])")
[ -n "$DD_TOKEN" ] && pass "Design Director login    (id=$DD_ID)" || fail "Design Director login" "no token"

E_RES=$(curl -s -X POST "$BASE/auth/designer/login/dev" -H 'Content-Type: application/json' -d '{"phone":"13800003333"}')
E_TOKEN=$(echo "$E_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
E_ID=$(echo "$E_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['user']['id'])")
[ -n "$E_TOKEN" ] && pass "Engineer login           (id=$E_ID)" || fail "Engineer login" "no token"

ED_RES=$(curl -s -X POST "$BASE/auth/designer/login/dev" -H 'Content-Type: application/json' -d '{"phone":"13800004444"}')
ED_TOKEN=$(echo "$ED_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
ED_ID=$(echo "$ED_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['user']['id'])")
[ -n "$ED_TOKEN" ] && pass "Eng Director login       (id=$ED_ID)" || fail "Eng Director login" "no token"

O_RES=$(curl -s -X POST "$BASE/auth/designer/login/dev" -H 'Content-Type: application/json' -d '{"phone":"13800005555"}')
O_TOKEN=$(echo "$O_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
O_ID=$(echo "$O_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['user']['id'])")
[ -n "$O_TOKEN" ] && pass "Owner login              (id=$O_ID)" || fail "Owner login" "no token"

# ============================================================
section "2. Create material order (construction entry point)"
# ============================================================

PROPERTY_ID=4; MATERIAL_ID=37; CAT_ID=6

echo "Setting material stock..."
curl -s -X PUT "$BASE/admin/materials/$MATERIAL_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantity":500}' > /dev/null
echo "  Material $MATERIAL_ID quantity → 500"

echo "Submitting order as owner..."
ORDER_RES=$(curl -s -X POST "$BASE/material-orders" \
  -H "Authorization: Bearer $O_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"property_id\":$PROPERTY_ID,\"room_number\":\"A1-101\",\"applicant_name\":\"TestOwner\",\"applicant_phone\":\"13800005555\",\"items\":[{\"material_id\":$MATERIAL_ID,\"category_id\":$CAT_ID}]}")

ORDER_NO=$(echo "$ORDER_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('order_no',''))")

if [ -n "$ORDER_NO" ]; then
  pass "Order created: $ORDER_NO"
else
  ERR=$(echo "$ORDER_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))" 2>/dev/null)
  fail "Order creation" "$ERR"
fi

# ============================================================
section "3. Phase 1 — Full happy path (design review → construction → accept)"
# ============================================================

if [ -z "$ORDER_NO" ]; then
  skip "Phase 1" "No order"
else
  # --- 3a. Admin: approve + start construction + assign designers ---
  echo "--- 3a. approve-and-assign ---"
  AARES=$(curl -s -X POST "$BASE/admin/material-orders/$ORDER_NO/approve-and-assign" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"designer_id\":$D_ID,\"design_director_id\":$DD_ID}")
  AAOK=$(echo "$AARES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
  [ "$AAOK" = "True" ] \
    && pass "approve-and-assign — 5 phases created" \
    || fail "approve-and-assign" "$(echo "$AARES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

  PHASE1_ID=$(curl -s "$BASE/material-orders/$ORDER_NO/phases" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); p=d.get('data',{}).get('phases',[]); print(p[0]['id'] if p else '')")

  if [ -z "$PHASE1_ID" ]; then
    fail "Phase 1" "No phase data"
  else
    echo "  Phase 1 ID: $PHASE1_ID"

    # --- 3b. Designer uploads design ---
    echo "--- 3b. Designer uploads design ---"
    UPRES=$(curl -s -X PUT "$BASE/construction-phases/$PHASE1_ID/upload-design" \
      -H "Authorization: Bearer $D_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"images":["/api/v1/placeholder/99/400/300","/api/v1/placeholder/98/400/300"]}')
    UPOK=$(echo "$UPRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$UPOK" = "True" ] && pass "Designer uploads design" \
      || fail "Upload design" "$(echo "$UPRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3c. Design director approves ---
    echo "--- 3c. Design director approves ---"
    DDARES=$(curl -s -X POST "$BASE/construction-phases/$PHASE1_ID/approve-design-director" \
      -H "Authorization: Bearer $DD_TOKEN" -H 'Content-Type: application/json' -d '{}')
    DDAOK=$(echo "$DDARES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$DDAOK" = "True" ] && pass "Design director approves" \
      || fail "Design director" "$(echo "$DDARES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3d. Admin reviews design ---
    echo "--- 3d. Admin reviews design ---"
    ADRES=$(curl -s -X POST "$BASE/admin/construction-phases/$PHASE1_ID/approve-design" \
      -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{}')
    ADOK=$(echo "$ADRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$ADOK" = "True" ] && pass "Admin approves design" \
      || fail "Admin design" "$(echo "$ADRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3e. Owner reviews design ---
    echo "--- 3e. Owner reviews design ---"
    ODRES=$(curl -s -X POST "$BASE/construction-phases/$PHASE1_ID/owner-approve-design" \
      -H "Authorization: Bearer $O_TOKEN" -H 'Content-Type: application/json' -d '{}')
    ODOK=$(echo "$ODRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$ODOK" = "True" ] && pass "Owner approves design" \
      || fail "Owner design" "$(echo "$ODRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3f. Assign engineer + eng director ---
    echo "--- 3f. Assign engineer + eng director ---"
    AERES=$(curl -s -X PUT "$BASE/admin/construction-phases/$PHASE1_ID/assign-engineer" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "{\"engineer_id\":$E_ID,\"engineering_director_id\":$ED_ID}")
    AEOK=$(echo "$AERES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$AEOK" = "True" ] && pass "Assign engineer + eng director" \
      || fail "Assign engineer" "$(echo "$AERES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3g. Engineer confirms design ---
    echo "--- 3g. Engineer confirms design ---"
    ECRES=$(curl -s -X POST "$BASE/construction-phases/$PHASE1_ID/confirm-design" \
      -H "Authorization: Bearer $E_TOKEN" -H 'Content-Type: application/json' -d '{}')
    ECOK=$(echo "$ECRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$ECOK" = "True" ] && pass "Engineer confirms design" \
      || fail "Eng confirm" "$(echo "$ECRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3h. Eng director confirms design ---
    echo "--- 3h. Eng director confirms design ---"
    EDCRES=$(curl -s -X POST "$BASE/construction-phases/$PHASE1_ID/director-confirm-design" \
      -H "Authorization: Bearer $ED_TOKEN" -H 'Content-Type: application/json' -d '{}')
    EDCOK=$(echo "$EDCRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$EDCOK" = "True" ] && pass "Eng director confirms design" \
      || fail "Eng dir confirm" "$(echo "$EDCRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3i. Engineer uploads construction ---
    echo "--- 3i. Engineer uploads construction ---"
    CUPRES=$(curl -s -X PUT "$BASE/construction-phases/$PHASE1_ID/upload-construction" \
      -H "Authorization: Bearer $E_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"images":["/api/v1/placeholder/88/400/300","/api/v1/placeholder/87/400/300"]}')
    CUPOK=$(echo "$CUPRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$CUPOK" = "True" ] && pass "Engineer uploads construction" \
      || fail "Upload construction" "$(echo "$CUPRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3j. Eng director approves construction ---
    echo "--- 3j. Eng director approves construction ---"
    EDARES=$(curl -s -X POST "$BASE/construction-phases/$PHASE1_ID/approve-engineering-director" \
      -H "Authorization: Bearer $ED_TOKEN" -H 'Content-Type: application/json' -d '{}')
    EDAOK=$(echo "$EDARES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$EDAOK" = "True" ] && pass "Eng director approves construction" \
      || fail "Eng dir approve" "$(echo "$EDARES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3k. Admin approves construction ---
    echo "--- 3k. Admin approves construction ---"
    ACRES=$(curl -s -X POST "$BASE/admin/construction-phases/$PHASE1_ID/approve-construction" \
      -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{}')
    ACOK=$(echo "$ACRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$ACOK" = "True" ] && pass "Admin approves construction" \
      || fail "Admin approve" "$(echo "$ACRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 3l. Owner accepts → Phase 1 complete, Phase 2 unlocked ---
    echo "--- 3l. Owner accepts phase 1 ---"
    OARES=$(curl -s -X POST "$BASE/construction-phases/$PHASE1_ID/accept" \
      -H "Authorization: Bearer $O_TOKEN" -H 'Content-Type: application/json' -d '{}')
    OAOK=$(echo "$OARES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    if [ "$OAOK" = "True" ]; then
      pass "Owner accepts — Phase 1 complete, Phase 2 unlocked!"
    else
      fail "Owner accept" "$(echo "$OARES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"
    fi
  fi
fi

# ============================================================
section "4. Admin rejection + designer resubmit (separate order)"
# ============================================================

echo "Creating a new order to test rejection → resubmit flow..."

# Ensure stock
curl -s -X PUT "$BASE/admin/materials/$MATERIAL_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantity":500}' > /dev/null

RJ_ORDER_RES=$(curl -s -X POST "$BASE/material-orders" \
  -H "Authorization: Bearer $O_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"property_id\":$PROPERTY_ID,\"room_number\":\"A1-102\",\"applicant_name\":\"TestOwner\",\"applicant_phone\":\"13800005555\",\"items\":[{\"material_id\":$MATERIAL_ID,\"category_id\":$CAT_ID}]}")
RJ_ORDER_NO=$(echo "$RJ_ORDER_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('order_no',''))")

if [ -z "$RJ_ORDER_NO" ]; then
  ERR=$(echo "$RJ_ORDER_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))" 2>/dev/null)
  fail "Rejection test: create order" "$ERR"
else
  echo "  Order: $RJ_ORDER_NO"

  # 4a. approve-and-assign
  RJ_AA=$(curl -s -X POST "$BASE/admin/material-orders/$RJ_ORDER_NO/approve-and-assign" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"designer_id\":$D_ID,\"design_director_id\":$DD_ID}")
  RJ_AAOK=$(echo "$RJ_AA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
  [ "$RJ_AAOK" = "True" ] && pass "Rejection test: approve-and-assign" \
    || fail "Rejection test: approve-and-assign" "failed"

  RJ_P1=$(curl -s "$BASE/material-orders/$RJ_ORDER_NO/phases" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); p=d.get('data',{}).get('phases',[]); print(p[0]['id'] if p else '')")

  if [ -n "$RJ_P1" ]; then
    # 4b. Designer uploads design
    curl -s -X PUT "$BASE/construction-phases/$RJ_P1/upload-design" \
      -H "Authorization: Bearer $D_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"images":["/api/v1/placeholder/55/400/300"]}' > /dev/null

    # 4c. Design director approves
    curl -s -X POST "$BASE/construction-phases/$RJ_P1/approve-design-director" \
      -H "Authorization: Bearer $DD_TOKEN" -H 'Content-Type: application/json' -d '{}' > /dev/null

    # 4d. Admin REJECTS design ← THE KEY TEST
    echo "--- Admin rejects design ---"
    RJRES=$(curl -s -X POST "$BASE/admin/construction-phases/$RJ_P1/reject-design" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"reason":"颜色方案需调整，请重新设计"}' )
    RJOK=$(echo "$RJRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$RJOK" = "True" ] && pass "Admin rejects design" \
      || fail "Admin reject" "$(echo "$RJRES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # Verify status = design_admin_rejected
    RJ_STATUS=$(curl -s "$BASE/construction-phases/$RJ_P1" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('status',''))")
    [ "$RJ_STATUS" = "design_admin_rejected" ] && pass "Status → design_admin_rejected" \
      || fail "Status check" "expected design_admin_rejected, got $RJ_STATUS"

    # 4e. Designer RESUBMITS after admin rejection ← THE BUG FIX
    echo "--- Designer resubmits after admin rejection ---"
    RURES=$(curl -s -X PUT "$BASE/construction-phases/$RJ_P1/upload-design" \
      -H "Authorization: Bearer $D_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"images":["/api/v1/placeholder/77/400/300","/api/v1/placeholder/76/400/300"]}')
    RUOK=$(echo "$RURES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    if [ "$RUOK" = "True" ]; then
      pass "Designer resubmits after admin rejection ✓ (bug fixed!)"
    else
      ERR=$(echo "$RURES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))" 2>/dev/null)
      fail "Designer resubmit" "$ERR"
    fi

    # 4f. Design director re-approves
    DD2RES=$(curl -s -X POST "$BASE/construction-phases/$RJ_P1/approve-design-director" \
      -H "Authorization: Bearer $DD_TOKEN" -H 'Content-Type: application/json' -d '{}')
    DD2OK=$(echo "$DD2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$DD2OK" = "True" ] && pass "Design director re-approves" \
      || fail "Design dir re-approve" "failed"

    # 4g. Admin approves
    AD2RES=$(curl -s -X POST "$BASE/admin/construction-phases/$RJ_P1/approve-design" \
      -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{}')
    AD2OK=$(echo "$AD2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$AD2OK" = "True" ] && pass "Admin approves resubmitted design" \
      || fail "Admin approve" "failed"

    # 4h. Owner approves → design complete
    OD2RES=$(curl -s -X POST "$BASE/construction-phases/$RJ_P1/owner-approve-design" \
      -H "Authorization: Bearer $O_TOKEN" -H 'Content-Type: application/json' -d '{}')
    OD2OK=$(echo "$OD2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$OD2OK" = "True" ] && pass "Owner approves (rejection→resubmit→re-approve chain OK)" \
      || fail "Owner approve" "failed"
  fi
fi

# ============================================================
section "5. Phase 2 — Skip-design verification (construction only)"
# ============================================================

if [ -n "$ORDER_NO" ]; then
  PHASES=$(curl -s "$BASE/material-orders/$ORDER_NO/phases" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  P2_ID=$(echo "$PHASES" | python3 -c "import sys,json; d=json.load(sys.stdin); p=d.get('data',{}).get('phases',[]); print(p[1]['id'] if len(p)>1 else '')")
  P2_STATUS=$(echo "$PHASES" | python3 -c "import sys,json; d=json.load(sys.stdin); p=d.get('data',{}).get('phases',[]); print(p[1]['status'] if len(p)>1 else '')")

  if [ -n "$P2_ID" ] && [ "$P2_STATUS" = "unassigned" ]; then
    echo "Phase 2 (water_electric): id=$P2_ID status=$P2_STATUS"

    # --- 5a. Try assign (4-role) on phase 2 → should be REJECTED ---
    echo "--- 5a. Try assign (4-role) on phase 2 — should FAIL ---"
    BAD_RES=$(curl -s -X PUT "$BASE/admin/construction-phases/$P2_ID/assign" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "{\"designer_id\":$D_ID,\"design_director_id\":$DD_ID,\"engineer_id\":$E_ID,\"engineering_director_id\":$ED_ID}")
    BAD_OK=$(echo "$BAD_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    if [ "$BAD_OK" != "True" ]; then
      pass "assign (4-role) blocked on phase 2 — design flow prevented"
    else
      fail "assign (4-role)" "Should have been rejected for phase_order>1"
    fi

    # --- 5b. assign-engineer on phase 2 (unassigned) → skipDesign → construction_confirmed ---
    echo "--- 5b. assign-engineer on phase 2 (skip design) ---"
    AE2RES=$(curl -s -X PUT "$BASE/admin/construction-phases/$P2_ID/assign-engineer" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "{\"engineer_id\":$E_ID,\"engineering_director_id\":$ED_ID}")
    AE2OK=$(echo "$AE2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    if [ "$AE2OK" = "True" ]; then
      pass "assign-engineer on phase 2 — design skipped, construction only"
    else
      ERR=$(echo "$AE2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))" 2>/dev/null)
      fail "assign-engineer phase 2" "$ERR"
    fi

    # Verify status = construction_confirmed (not assigned / design flow)
    P2_STATUS=$(curl -s "$BASE/construction-phases/$P2_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('status',''))")
    if [ "$P2_STATUS" = "construction_confirmed" ]; then
      pass "Phase 2 status → construction_confirmed (design bypassed)"
    else
      fail "Phase 2 status" "expected construction_confirmed, got $P2_STATUS"
    fi

    # --- 5c. Engineer confirms design ---
    echo "--- 5c. Engineer confirms design ---"
    EC2RES=$(curl -s -X POST "$BASE/construction-phases/$P2_ID/confirm-design" \
      -H "Authorization: Bearer $E_TOKEN" -H 'Content-Type: application/json' -d '{}')
    EC2OK=$(echo "$EC2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$EC2OK" = "True" ] && pass "Engineer confirms design (phase 2)" \
      || fail "Eng confirm" "$(echo "$EC2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 5d. Eng director confirms ---
    echo "--- 5d. Eng director confirms ---"
    EDC2RES=$(curl -s -X POST "$BASE/construction-phases/$P2_ID/director-confirm-design" \
      -H "Authorization: Bearer $ED_TOKEN" -H 'Content-Type: application/json' -d '{}')
    EDC2OK=$(echo "$EDC2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$EDC2OK" = "True" ] && pass "Eng director confirms (phase 2)" \
      || fail "Eng dir confirm" "$(echo "$EDC2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 5e. Engineer uploads construction ---
    echo "--- 5e. Engineer uploads construction ---"
    CUP2RES=$(curl -s -X PUT "$BASE/construction-phases/$P2_ID/upload-construction" \
      -H "Authorization: Bearer $E_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"images":["/api/v1/placeholder/66/400/300"]}')
    CUP2OK=$(echo "$CUP2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$CUP2OK" = "True" ] && pass "Engineer uploads construction (phase 2)" \
      || fail "Upload construction" "$(echo "$CUP2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 5f. Eng director approves ---
    echo "--- 5f. Eng director approves ---"
    EDA2RES=$(curl -s -X POST "$BASE/construction-phases/$P2_ID/approve-engineering-director" \
      -H "Authorization: Bearer $ED_TOKEN" -H 'Content-Type: application/json' -d '{}')
    EDA2OK=$(echo "$EDA2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$EDA2OK" = "True" ] && pass "Eng director approves (phase 2)" \
      || fail "Eng dir approve" "$(echo "$EDA2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 5g. Admin approves ---
    echo "--- 5g. Admin approves ---"
    AC2RES=$(curl -s -X POST "$BASE/admin/construction-phases/$P2_ID/approve-construction" \
      -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{}')
    AC2OK=$(echo "$AC2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$AC2OK" = "True" ] && pass "Admin approves (phase 2)" \
      || fail "Admin approve" "$(echo "$AC2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"

    # --- 5h. Owner accepts phase 2 ---
    echo "--- 5h. Owner accepts phase 2 ---"
    OA2RES=$(curl -s -X POST "$BASE/construction-phases/$P2_ID/accept" \
      -H "Authorization: Bearer $O_TOKEN" -H 'Content-Type: application/json' -d '{}')
    OA2OK=$(echo "$OA2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
    [ "$OA2OK" = "True" ] && pass "Owner accepts — Phase 2 complete!" \
      || fail "Owner accept" "$(echo "$OA2RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message',''))")"
  else
    skip "Phase 2" "status=$P2_STATUS (need unassigned)"
  fi
fi

# ============================================================
section "6. Task lists for all roles"
# ============================================================

D_COUNT=$(curl -s "$BASE/designer/construction-phases" -H "Authorization: Bearer $D_TOKEN" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('list',[])))")
echo "  Designer tasks: $D_COUNT"
[ "$D_COUNT" -gt 0 ] && pass "Designer tasks" || fail "Designer tasks" "0"

DD_COUNT=$(curl -s "$BASE/director/design/phases" -H "Authorization: Bearer $DD_TOKEN" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('list',[])))")
echo "  Design Director tasks: $DD_COUNT"
[ "$DD_COUNT" -gt 0 ] && pass "Design Director tasks" || fail "Design Dir tasks" "0"

E_COUNT=$(curl -s "$BASE/engineer/construction-phases" -H "Authorization: Bearer $E_TOKEN" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('list',[])))")
echo "  Engineer tasks: $E_COUNT"
[ "$E_COUNT" -gt 0 ] && pass "Engineer tasks" || fail "Engineer tasks" "0"

ED_COUNT=$(curl -s "$BASE/director/engineering/phases" -H "Authorization: Bearer $ED_TOKEN" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('list',[])))")
echo "  Eng Director tasks: $ED_COUNT"
[ "$ED_COUNT" -gt 0 ] && pass "Eng Director tasks" || fail "Eng Dir tasks" "0"

# ============================================================
section "7. Auth & permission checks"
# ============================================================

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/construction-phases/1")
[ "$CODE" = "401" ] && pass "Unauthenticated → 401" || fail "Auth" "Expected 401 got $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/material-orders/x/phases" -H "Authorization: Bearer $D_TOKEN")
[ "$CODE" = "403" ] && pass "Non-admin → 403" || fail "Permission" "Expected 403 got $CODE"

# Order detail with phases
if [ -n "$ORDER_NO" ]; then
  OD=$(curl -s "$BASE/material-orders/detail/$ORDER_NO" -H "Authorization: Bearer $O_TOKEN")
  OD_OK=$(echo "$OD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))")
  P_COUNT=$(echo "$OD" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('phases',[])))")
  [ "$OD_OK" = "True" ] && pass "Order detail with $P_COUNT phases" || fail "Order detail" "failed"
fi

# Phase detail with logs
if [ -n "$PHASE1_ID" ]; then
  PD=$(curl -s "$BASE/construction-phases/$PHASE1_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  L_COUNT=$(echo "$PD" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{}).get('logs',[])))")
  [ "$L_COUNT" -gt 0 ] && pass "Phase detail with $L_COUNT log entries" || fail "Phase logs" "0 entries"
fi

# ============================================================
section "SUMMARY"
# ============================================================
TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo "  Total: $TOTAL  |  ${GREEN}Pass: $PASS${NC}  |  ${RED}Fail: $FAIL${NC}  |  ${YELLOW}Skip: $SKIP${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}  All construction flow tests passed!${NC}"
  exit 0
else
  echo -e "${RED}  $FAIL test(s) failed${NC}"
  exit 1
fi
