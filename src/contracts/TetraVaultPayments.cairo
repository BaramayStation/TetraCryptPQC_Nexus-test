%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256
from starkware.cairo.common.bool import TRUE, FALSE
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.math import assert_not_zero

// Storage variables
@storage_var
func admin() -> (address: felt) {
}

@storage_var
func is_paused() -> (paused: felt) {
}

@storage_var
func subscription_tiers(tier: felt) -> (price: Uint256) {
}

@storage_var
func user_subscriptions(user: felt) -> (
    tier: felt,
    expiration: felt,
    active: felt
) {
}

@storage_var
func payment_history(user: felt, payment_id: felt) -> (
    amount: Uint256,
    timestamp: felt
) {
}

// Events
@event
func SubscriptionCreated(user: felt, tier: felt, expiration: felt) {
}

@event
func PaymentReceived(user: felt, amount: Uint256, payment_id: felt) {
}

@event
func ContractPaused(admin: felt) {
}

@event
func ContractUnpaused(admin: felt) {
}

// Constructor
@constructor
func constructor{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    admin_address: felt
) {
    admin.write(admin_address);
    is_paused.write(FALSE);

    // Set initial subscription tiers
    subscription_tiers.write(1, Uint256(5 * 10**18)); // Basic: 5 USDC
    subscription_tiers.write(2, Uint256(10 * 10**18)); // Premium: 10 USDC
    subscription_tiers.write(3, Uint256(100 * 10**18)); // Business: 100 USDC
    subscription_tiers.write(4, Uint256(1000 * 10**18)); // Military: 1000 USDC

    return ();
}

// Modifiers
func only_admin{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    let (caller) = get_caller_address();
    let (current_admin) = admin.read();
    assert caller = current_admin;
    return ();
}

func not_paused{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    let (paused) = is_paused.read();
    assert paused = FALSE;
    return ();
}

// External functions
@external
func subscribe{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    tier: felt,
    payment_id: felt
) -> (success: felt) {
    alloc_locals;
    not_paused();

    // Get caller address
    let (caller) = get_caller_address();
    assert_not_zero(caller);

    // Verify tier exists
    let (price) = subscription_tiers.read(tier);
    assert_not_zero(price.low);

    // Calculate expiration (30 days from now)
    let (block_timestamp) = get_block_timestamp();
    let expiration = block_timestamp + 2592000; // 30 days in seconds

    // Store subscription
    user_subscriptions.write(caller, (tier, expiration, TRUE));

    // Store payment
    payment_history.write(caller, payment_id, (price, block_timestamp));

    // Emit events
    SubscriptionCreated.emit(caller, tier, expiration);
    PaymentReceived.emit(caller, price, payment_id);

    return (TRUE);
}

@external
func check_access{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    user: felt
) -> (has_access: felt) {
    alloc_locals;

    // Get subscription details
    let (tier, expiration, active) = user_subscriptions.read(user);

    // Check if subscription is active and not expired
    let (block_timestamp) = get_block_timestamp();
    if (active == TRUE) {
        if (block_timestamp <= expiration) {
            return (TRUE);
        }
    }

    return (FALSE);
}

@external
func pause{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    success: felt
) {
    only_admin();
    is_paused.write(TRUE);
    let (caller) = get_caller_address();
    ContractPaused.emit(caller);
    return (TRUE);
}

@external
func unpause{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    success: felt
) {
    only_admin();
    is_paused.write(FALSE);
    let (caller) = get_caller_address();
    ContractUnpaused.emit(caller);
    return (TRUE);
}

@external
func update_tier_price{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    tier: felt,
    new_price: Uint256
) -> (success: felt) {
    only_admin();
    subscription_tiers.write(tier, new_price);
    return (TRUE);
}

@external
func update_admin{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    new_admin: felt
) -> (success: felt) {
    only_admin();
    admin.write(new_admin);
    return (TRUE);
}

// View functions
@view
func get_tier_price{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    tier: felt
) -> (price: Uint256) {
    let (price) = subscription_tiers.read(tier);
    return (price);
}

@view
func get_subscription{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    user: felt
) -> (tier: felt, expiration: felt, active: felt) {
    let (tier, expiration, active) = user_subscriptions.read(user);
    return (tier, expiration, active);
}

@view
func get_payment{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    user: felt,
    payment_id: felt
) -> (amount: Uint256, timestamp: felt) {
    let (amount, timestamp) = payment_history.read(user, payment_id);
    return (amount, timestamp);
}

@view
func get_admin{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    admin_address: felt
) {
    let (current_admin) = admin.read();
    return (current_admin);
}

@view
func is_contract_paused{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    paused: felt
) {
    let (current_paused) = is_paused.read();
    return (current_paused);
}

// Internal functions
func get_block_timestamp() -> (timestamp: felt) {
    // This would be replaced with actual block timestamp in production
    return (12345);
}
